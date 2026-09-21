# DocuMind AI 🧠
### Enterprise Multimodal RAG Document Intelligence Platform

[![CI/CD Pipeline](https://github.com/Abhijith-Sura/DocuMind/actions/workflows/ci.yml/badge.svg)](https://github.com/Abhijith-Sura/DocuMind/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker)](https://www.docker.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-Deployed-46E3B7?logo=render)](https://render.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange)](https://www.trychroma.com)

> Upload documents (PDFs, DOCX, Notes, Resumes). Ask questions. Get **grounded, cited answers with page numbers and confidence scores**, backed by RAGAS evaluation metrics and modern cloud architecture.

---

## ☁️ DevOps, Cloud Deployment & Architecture

| Layer | Tool / Service | Cost | Resume Keywords |
| :--- | :--- | :---: | :--- |
| **Containerization** | **Docker** — Multi-stage `Dockerfile` for each service + `docker-compose.yml` for local orchestration | **FREE** | `Docker`, `Dockerfile`, `Docker Compose`, `Containerization` |
| **CI/CD Pipeline** | **GitHub Actions** — automated pipeline (lint → unit tests → Next.js build → Docker image verify) | **FREE** | `CI/CD`, `GitHub Actions`, `Automated Pipeline`, `DevOps` |
| **Frontend Deploy** | **Vercel** — automated zero-config deployments on push from GitHub | **FREE** | `Vercel`, `Cloud Deployment`, `Next.js 14`, `Edge Network` |
| **AI Backend Deploy** | **Render** — automated Docker web service with persistent vector storage | **FREE** | `Render`, `Docker Deployment`, `Microservices`, `FastAPI` |
| **Cloud Database** | **PostgreSQL / MongoDB Atlas / SQLite** — flexible async ORM via SQLAlchemy | **FREE** | `PostgreSQL`, `MongoDB Atlas`, `SQLAlchemy`, `Cloud Database` |
| **Vector Database** | **ChromaDB** — embedded HNSW vector store with cosine similarity persistence | **FREE** | `ChromaDB`, `Vector Database`, `Embeddings`, `HNSW` |

---

## 🏗️ System Architecture

```
User Upload ──► Ingestion Pipeline ──► ChromaDB Vector Store
                  │                          │
                  ├─ PDF/DOCX Parser         │
                  ├─ Recursive Chunker       ▼
                  ├─ BGE-M3 Embedder    User Query
                  └─ MLflow Tracking         │
                                        ┌────▼────┐
                                        │ Hybrid  │
                                        │ Search  │ ◄── BM25 + Dense Semantic
                                        └────┬────┘
                                             │ Top-20 chunks
                                        ┌────▼────┐
                                        │Reranker │ ◄── Cross-Encoder / Cohere
                                        └────┬────┘
                                             │ Top-5 chunks (or sequential full-doc)
                                        ┌────▼────┐
                                        │ Gemini  │ ◄── Gemini 3.1 Flash Lite
                                        │   LLM   │
                                        └────┬────┘
                                             │
                                     Answer + Citations
                                             │
                                        ┌────▼────┐
                                        │  RAGAS  │ ──► Evaluation & Analytics
                                        │  Eval   │
                                        └─────────┘
```

---

## ✨ Key Features

| Feature | Implementation |
|---|---|
| **Hybrid Search** | BM25 (`rank-bm25`) + Semantic (`ChromaDB`) fused via Reciprocal Rank Fusion (RRF) |
| **Cross-Encoder Reranking** | Re-scores retrieved candidate chunks using calibrated sentence-transformer models |
| **Whole-Document Mode** | Automatic detection for summaries, reviews, and short documents (resumes) in sequential reading order |
| **Google Authentication** | Secure Google One-Tap and OAuth 2.0 with JWT token sessions |
| **Embeddings** | `BAAI/bge-m3` (1024-dim, multilingual, dense + sparse representation) |
| **LLM Generation** | Google GenAI `gemini-3.1-flash-lite` and `gemini-3.5-flash-lite` (~3s ultra-fast generation) |
| **Evaluation Metrics** | RAGAS: Faithfulness, Answer Relevancy, Context Precision, Context Recall |
| **Real-time UI** | Next.js 14 frosted-glass dashboard, real-time citation cards with page match percentages |

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Setup
```bash
git clone https://github.com/Abhijith-Sura/DocuMind.git
cd DocuMind
```

### 2. Configure Environment Variables
```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env.local
```
Add your `GEMINI_API_KEY` in `backend/.env` and your `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local`.

### 3. Run with Docker Compose
```bash
docker compose up --build
```

### 4. Access Services
* **Frontend UI:** [http://localhost:3000](http://localhost:3000)
* **Backend API (Swagger Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 🌐 Production Cloud Deployment

### 1. Deploy AI Backend to Render
1. Create an account on [Render.com](https://render.com).
2. Click **New +** → **Blueprint** and connect your GitHub repo `https://github.com/Abhijith-Sura/DocuMind`.
3. Render will automatically detect [`render.yaml`](./render.yaml).
4. In the Render Dashboard, add your secret environment variables:
   * `GEMINI_API_KEY`: Your Google Gemini API key.
   * `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
5. Render deploys your backend Docker container and provides a public URL (e.g., `https://documind-api.onrender.com`).

### 2. Deploy Frontend to Vercel
1. Go to [Vercel.com](https://vercel.com) and import `https://github.com/Abhijith-Sura/DocuMind`.
2. Set the **Root Directory** to `frontend`.
3. Add Environment Variables in the Vercel project settings:
   * `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g., `https://documind-api.onrender.com`).
   * `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
4. Click **Deploy**. Vercel will build and deploy your Next.js frontend globally on their Edge network.

---

## 🔄 Automated CI/CD Pipeline (GitHub Actions)

Every push and pull request to `main` automatically triggers [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):
1. **Backend Tests:** Installs system tools (`poppler`, `tesseract`), Python requirements, and executes `pytest tests/test_health.py`.
2. **Frontend Build:** Runs `npm ci` and verifies production compilation (`npm run build`).
3. **Docker Verification:** Validates that both the backend and frontend Dockerfiles build cleanly.

---

## 📁 Project Structure

```
DocuMind/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI/CD Pipeline
├── backend/
│   ├── Dockerfile               # Multi-stage Python 3.11 Dockerfile
│   ├── requirements.txt         # FastAPI, ChromaDB, PyTorch, GenAI
│   ├── render.yaml              # Render Cloud deployment blueprint
│   ├── app/
│   │   ├── api/routes/          # Auth, Documents, Query, Evaluation
│   │   ├── core/                # Config, Security, Database
│   │   ├── models/              # SQLAlchemy Models
│   │   └── rag/
│   │       ├── ingestion/       # Parser, Recursive Chunker, Embedder
│   │       ├── retrieval/       # ChromaDB VectorStore, Hybrid Search, Reranker
│   │       └── generation/      # Chain, Prompts, Google GenAI LLM Client
│   └── tests/                   # Automated smoke & unit tests
├── frontend/
│   ├── Dockerfile               # Multi-stage Next.js 14 Dockerfile
│   ├── vercel.json              # Vercel deployment configuration
│   └── app/
│       ├── dashboard/           # Chat, Documents, Analytics
│       └── (auth)/              # Login, Register, Google One-Tap
├── docker-compose.yml           # Local multi-service orchestration
├── render.yaml                  # Root Render Cloud Blueprint
└── README.md
```

---

## 📊 Evaluation & RAGAS Metrics

| Metric | What It Measures | Target |
|---|---|---|
| **Faithfulness** | Is the answer grounded exclusively in retrieved context? | > 0.85 |
| **Answer Relevancy** | Does the answer directly address user intent? | > 0.80 |
| **Context Precision** | Are retrieved chunks relevant to the question? | > 0.75 |
| **Context Recall** | Did retrieval include all necessary facts? | > 0.70 |

---

## 📝 License
Distributed under the MIT License.
