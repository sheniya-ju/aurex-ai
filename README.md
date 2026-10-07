
```markdown
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
- Headings and lists
- Code block rendering
- Copy responses
- Copy code blocks
- Conversation history
- New chat functionality
- Message actions
- Responsive chat interface

### 📄 PDF RAG

- Upload PDF documents
- Extract text from PDF pages
- Split documents into searchable chunks
- Generate vector embeddings
- Semantic document search
- Ask questions about uploaded documents
- Retrieve relevant document context
- Source document references
- Page-level source references
- View source excerpts

### 🔀 Intelligent Document Context

AUREX AI can use uploaded document information when a user's question is related to the documents.

The system combines:

```text
User Question
      ↓
Document Context Retrieval
      ↓
Relevant Information
      ↓
AI Model
      ↓
Generated Answer
```

This allows users to ask questions naturally without manually handling the underlying retrieval process.

### 💬 Chat Management

- Create new conversations
- View recent conversations
- Delete conversations
- Persistent conversation history
- User-specific conversations
- Conversation titles
- Message history

### 👤 Authentication

- User registration
- User login
- Password hashing
- JWT-based authentication
- Protected API endpoints
- User-specific data

### 📁 Projects

AUREX AI supports project-based organization for managing AI work and conversations.

### ⚙️ Settings

- Application settings
- Theme support
- Dark mode
- User preferences
- Responsive settings interface

### 🎨 User Interface

- Professional red and white design
- AUREX AI branding
- Responsive layout
- Desktop support
- Tablet support
- Mobile support
- Modern chat interface
- Document attachment interface
- Source viewer

---

# 🏗️ System Architecture

```text
                         AUREX AI
                            │
                            ▼
                 ┌─────────────────────┐
                 │   React Frontend    │
                 │ React + TypeScript  │
                 │       + Vite        │
                 └──────────┬──────────┘
                            │
                         HTTPS
                            │
                            ▼
                 ┌─────────────────────┐
                 │    FastAPI Backend  │
                 │       Python        │
                 └──────────┬──────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   ┌────────────┐    ┌────────────┐    ┌────────────┐
   │    Auth    │    │ AI / RAG   │    │    Chat    │
   │   Service  │    │  Services  │    │   Service  │
   └────────────┘    └──────┬─────┘    └────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
             ┌─────────────┐   ┌─────────────┐
             │ PostgreSQL  │   │   Chroma    │
             │   Database  │   │ Vector DB   │
             └─────────────┘   └─────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- CSS
- Lucide React
- Responsive UI

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT Authentication

## AI

- Groq API
- GPT-OSS model
- Retrieval-Augmented Generation (RAG)

## Document Processing

- PyMuPDF
- Sentence Transformers
- Chroma

## Database

- PostgreSQL
- SQLAlchemy ORM

## Development Tools

- Git
- GitHub
- VS Code

---

# 📂 Project Structure

```text
aurex-ai/
│
├── backend/
│   │
│   ├── app/
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   ├── documents.py
│   │   │   ├── projects.py
│   │   │   └── settings.py
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   │
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   └── models.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── chat.py
│   │   │   └── documents.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm_service.py
│   │   │   ├── rag_service.py
│   │   │   └── router.py
│   │   │
│   │   └── main.py
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── .gitignore
│
├── frontend/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   └── aurex-logo.png
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   └── vite-env.d.ts
│   │
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

# 🔐 Authentication Flow

AUREX AI uses JWT-based authentication.

```text
                User
                 │
                 ▼
        ┌─────────────────┐
        │ Register / Login│
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ FastAPI Backend │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Password Verify │
        └────────┬────────┘
                 │
                 ▼
          JWT Access Token
                 │
                 ▼
        Authenticated User
```

Protected API requests use the JWT access token.

---

# 📄 Retrieval-Augmented Generation

AUREX AI uses RAG to answer questions based on uploaded documents.

The document processing pipeline is:

```text
PDF Upload
     ↓
Text Extraction
     ↓
Page Processing
     ↓
Text Chunking
     ↓
Embedding Generation
     ↓
Vector Storage
     ↓
User Question
     ↓
Semantic Search
     ↓
Relevant Chunks
     ↓
AI Context
     ↓
LLM
     ↓
Generated Answer
     ↓
Source References
```

Document information is used internally to provide context to the AI.

Users can optionally view:

- Source document
- Page number
- Relevant excerpt

---

# 🧠 AI Response Flow

For a normal question:

```text
User
 ↓
AUREX AI
 ↓
LLM
 ↓
Response
```

For a document-related question:

```text
User
 ↓
AUREX AI
 ↓
Document Retrieval
 ↓
Relevant PDF Content
 ↓
LLM
 ↓
Context-aware Response
 ↓
Sources
```

---

# 💻 Local Installation

## 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/aurex-ai.git
```

Move into the project:

```bash
cd aurex-ai
```

---

# 🐍 Backend Setup

Move into the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\activate
```

Install the required packages:

```bash
pip install -r requirements.txt
```

---

# 🔑 Backend Environment Variables

Create a file named:

```text
backend/.env
```

Add the required environment variables:

```env
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
GROQ_API_KEY=your_groq_api_key
```

Do not commit the `.env` file to GitHub.

---

# ▶️ Run the Backend

From the `backend` directory:

```bash
python -m uvicorn app.main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI documentation will be available at:

```text
http://127.0.0.1:8000/docs
```

Alternative documentation:

```text
http://127.0.0.1:8000/redoc
```

---

# ⚛️ Frontend Setup

Open a new terminal.

Move into the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# 🏗️ Production Build

To create a production build of the frontend:

```bash
npm run build
```

The generated production files will be placed inside:

```text
frontend/dist/
```

---

# 🔒 Security

AUREX AI follows basic security practices including:

- Password hashing
- JWT authentication
- Protected API routes
- User-specific conversations
- User-specific documents
- Environment variables for secrets
- `.gitignore` protection for local files

### Never commit:

```text
.env
backend/.env
backend/venv/
backend/chroma_data/
backend/uploads/
frontend/node_modules/
frontend/dist/
```

API keys and database credentials must always remain private.

---

# 📱 Responsive Design

AUREX AI is designed to adapt to different screen sizes.

Supported layouts include:

- Desktop
- Laptop
- Tablet
- Mobile

The interface adapts:

- Sidebar
- Chat area
- Message area
- Composer
- Document attachments
- Source panels
- Projects
- Settings

---

# 🎨 Design

AUREX AI uses a professional red and white visual identity.

### Primary Colors

```text
Primary Red:  #D71920
Dark Red:     #B91C1C
White:        #FFFFFF
Light Gray:   #F7F7F7
Border:       #E5E5E5
Text:         #171717
Muted Text:   #737373
```

The application also supports a dark theme.

---

# 📊 Current Capabilities

| Feature | Status |
|---|---|
| User Registration | ✅ |
| User Login | ✅ |
| JWT Authentication | ✅ |
| AI Chat | ✅ |
| Chat History | ✅ |
| New Chat | ✅ |
| Delete Chat | ✅ |
| PDF Upload | ✅ |
| PDF Text Extraction | ✅ |
| Document Chunking | ✅ |
| Vector Embeddings | ✅ |
| Chroma Vector Search | ✅ |
| RAG Responses | ✅ |
| Source References | ✅ |
| Source Page Numbers | ✅ |
| Markdown Rendering | ✅ |
| Code Blocks | ✅ |
| Markdown Tables | ✅ |
| Projects | ✅ |
| Settings | ✅ |
| Dark Mode | ✅ |
| Responsive UI | ✅ |

---

# 🚀 Deployment Architecture

The planned production architecture is:

```text
                    GitHub
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
         Vercel               Render
             │                   │
             │              FastAPI Backend
             │                   │
             │          ┌────────┴────────┐
             │          │                 │
             │          ▼                 ▼
             │     PostgreSQL          Vector Storage
             │
             ▼
       React Frontend
             │
             └──────────────► FastAPI API
```

---

# 🌐 Deployment

AUREX AI is designed to be deployed as a separate frontend and backend application.

### Frontend

```text
React + TypeScript + Vite
        ↓
     Vercel
```

### Backend

```text
FastAPI + Python
        ↓
      Render
```

### Database

```text
PostgreSQL
```

### Vector Storage

```text
Chroma / Persistent Vector Storage
```

Environment variables are configured separately in the deployment platforms and are not stored in the GitHub repository.

---

# 🧪 Testing Checklist

Before deployment, verify:

```text
☐ Register a new user
☐ Login
☐ Create a new chat
☐ Ask a general AI question
☐ Receive an AI response
☐ Test Markdown formatting
☐ Test Markdown tables
☐ Test code blocks
☐ Upload a PDF
☐ Ask a question about the PDF
☐ Verify document-based response
☐ Open source references
☐ Verify page numbers
☐ Create another conversation
☐ Refresh the application
☐ Verify chat history
☐ Delete a conversation
☐ Test settings
☐ Test dark mode
☐ Test mobile responsiveness
```

---

# 🔮 Future Improvements

Planned improvements include:

- [ ] Streaming AI responses
- [ ] Advanced automatic AI/RAG routing
- [ ] Multiple AI model selection
- [ ] Web search
- [ ] Voice input
- [ ] Image understanding
- [ ] Image generation
- [ ] More document formats
- [ ] Advanced project management
- [ ] Chat search
- [ ] File management
- [ ] Admin dashboard
- [ ] Usage analytics
- [ ] Improved RAG ranking
- [ ] Production-grade vector storage
- [ ] Enhanced security
- [ ] Production monitoring

---

# 📚 Learning Outcomes

This project demonstrates practical experience with:

- Full-stack web development
- React
- TypeScript
- Python
- FastAPI
- REST APIs
- SQLAlchemy
- PostgreSQL
- Authentication
- JWT
- AI API integration
- Retrieval-Augmented Generation
- Vector databases
- Embeddings
- PDF processing
- Semantic search
- Responsive UI development
- Git and GitHub
- Cloud deployment

---

# 👩‍💻 Author

## Sheniya

B.Tech Information Technology

AUREX AI was developed as a full-stack AI application project combining modern web development, backend engineering, database management, and artificial intelligence.

---

# 📜 License

This project is developed for educational, internship, and portfolio purposes.
