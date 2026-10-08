# AUREX AI 🤖

> An AI-powered full-stack chatbot with intelligent conversations, PDF-based RAG, project workspaces, chat history, and document-aware responses.

## 🌐 Live Demo

https://aurex-ai-gray.vercel.app

## 💻 GitHub Repository

https://github.com/sheniya-ju/aurex-ai

---

## 📌 About the Project

**AUREX AI** is a full-stack AI chatbot application built to provide intelligent, context-aware conversations while allowing users to work with their own documents and organize conversations into projects.

The project was built from the ground up, covering everything from the frontend interface and backend APIs to authentication, database integration, document processing, AI integration, and deployment.

The goal was not just to build a chatbot, but to understand how a modern AI-powered full-stack application works as a complete system.

---

## ✨ Features

### 🤖 AI Chat

- AI-powered conversations
- Streaming AI responses
- Markdown and code rendering
- Copy responses
- Reply to individual messages
- New conversation support
- Conversation history

### 📄 PDF & Document RAG

- Upload PDF documents
- Process uploaded documents
- Extract document content
- Retrieve relevant document context
- Ask questions based on uploaded documents
- View sources used for responses
- View source excerpts and page information
- Delete uploaded documents

### 📁 Project Workspaces

- Create multiple projects
- Add project descriptions and instructions
- Attach documents to projects
- Project-specific conversations
- Multiple chats inside a project
- Project-aware document context
- Pin project conversations
- Edit and delete projects

### 💬 Conversation Management

- Create new chats
- View chat history
- Delete conversations
- Pin important conversations
- Separate project and normal conversations
- Automatically generated conversation titles

### 🔐 Authentication

- User registration
- User login
- Secure password handling
- Token-based authentication
- Protected API routes

### ⚙️ Settings

- Application settings
- Model configuration
- User preferences
- Responsive settings interface

### 📱 Responsive UI

- Desktop-friendly interface
- Mobile responsive design
- Mobile sidebar
- Responsive chat composer
- Clean and modern UI

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- CSS
- Lucide React

### Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- REST APIs

### Database

- PostgreSQL

### AI

- Groq API
- `openai/gpt-oss-20b`
- Retrieval-Augmented Generation (RAG)

### Vector / Document Processing

- Chroma
- PDF document processing
- Document chunking
- Semantic/context retrieval

### Deployment

- Vercel — Frontend
- Render — Backend
- PostgreSQL — Database

### Development Tools

- Git
- GitHub
- VS Code
- Swagger / OpenAPI

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │     AUREX AI UI     │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │
                               │ HTTPS / REST API
                               ▼
                    ┌─────────────────────┐
                    │     FastAPI API     │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ PostgreSQL  │   │    RAG      │   │  Groq LLM   │
      │  Database   │   │   System    │   │ GPT-OSS 20B │
      └─────────────┘   └─────────────┘   └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │  Documents  │
                       │  / PDFs     │
                       └─────────────┘
```

---

## 📂 Project Structure

```text
aurex-ai/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── documents.py
│   │   │   ├── projects.py
│   │   │   └── settings.py
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   │
│   │   ├── database/
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   └── documents.py
│   │   │
│   │   ├── services/
│   │   │   ├── llm_service.py
│   │   │   ├── rag_service.py
│   │   │   └── router.py
│   │   │
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   └── aurex-logo.png
│   │   │
│   │   ├── components/
│   │   │   ├── ProjectPanel.tsx
│   │   │   └── SettingsPanel.tsx
│   │   │
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   └── vite-env.d.ts
│   │
│   ├── package.json
│   └── index.html
│
└── README.md
```

---

## 🔄 How AUREX AI Works

### 1. User Authentication

Users can register and log in to access their conversations, documents, projects, and settings.

### 2. Normal AI Chat

```text
User Message
     ↓
FastAPI Backend
     ↓
AI Request
     ↓
Groq LLM
     ↓
Streaming Response
     ↓
AUREX AI Chat Interface
```

### 3. Document-Based Chat

```text
PDF Upload
     ↓
Document Processing
     ↓
Text Extraction
     ↓
Text Chunking
     ↓
Vector / Context Retrieval
     ↓
Relevant Sources
     ↓
LLM
     ↓
Context-Aware Answer
```

### 4. Project Chat

```text
Project
   │
   ├── Project Instructions
   │
   ├── Project Documents
   │
   ├── Chat 1
   │
   ├── Chat 2
   │
   └── Chat 3
          ↓
    Project Context
          ↓
        RAG
          ↓
       AI Response
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js
- Python 3.10+
- PostgreSQL
- Git
- Groq API key

### Clone the Repository

```bash
git clone https://github.com/sheniya-ju/aurex-ai.git

cd aurex-ai
```

---

## ⚙️ Backend Setup

Go to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=your_postgresql_database_url
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_secret_key
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 💻 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

The frontend will run at:

```text
http://localhost:5173
```

---

## 🔑 Environment Variables

Never commit your real API keys or passwords.

Example:

```env
DATABASE_URL=your_database_url
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_secret_key
```

Make sure `.env` is included in `.gitignore`.

---



## 🌐 Deployment

### Frontend

The frontend is deployed using **Vercel**.

### Backend

The FastAPI backend is deployed using **Render**.

### Database

PostgreSQL is used for persistent application data.

---

## 🎯 What I Learned

Building AUREX AI helped me gain practical experience in:

- Building full-stack applications
- Designing REST APIs
- React and TypeScript development
- FastAPI backend development
- PostgreSQL database design
- SQLAlchemy ORM
- Authentication
- AI/LLM integration
- RAG architecture
- PDF/document processing
- State management
- Streaming responses
- Git and GitHub workflows
- Cloud deployment
- Debugging production issues
- Building responsive interfaces

---

## 🔮 Future Improvements

Some features I would like to explore further:

- Advanced semantic search
- More AI model options
- Improved document retrieval
- Voice conversations
- Image understanding
- More file formats
- Team collaboration
- Shared project workspaces
- Advanced analytics
- Improved personalization

---

## 👩‍💻 Developer

**Sheniya**
Full-Stack Development | AI | Web Development

---

## ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub!

---

## 📜 License

This project is created for learning, development, and portfolio purposes.
