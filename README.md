# Wood

A RAG-based PDF chat app. Upload a document, ask questions, get answers grounded in the content.

**Live:** [https://ai-doc-chat-gamma.vercel.app/](https://ai-doc-chat-gamma.vercel.app/)

---

## How it works

1. User uploads a PDF
2. Backend chunks the document and builds a FAISS vector index
3. Session ID is returned and stored in frontend state
4. User asks a question
5. Question is embedded and matched against the index (retrieval)
6. Relevant chunks are passed to an LLM as context
7. Answer is returned and shown in the chat

---

## Stack

**Frontend**
- Next.js 15 (App Router, TypeScript)
- Tailwind CSS v4

**Backend**
- FastAPI
- LangChain for chunking and retrieval pipeline
- FAISS for vector storage
- HuggingFace embeddings
- Groq (Llama 3) for answer generation
- Deployed on Render

---

## Repo structure

```
Wood/
├── backend/       FastAPI app, RAG pipeline, API routes
├── frontend/      Next.js app, UI components, API client
└── .gitignore
```

---
