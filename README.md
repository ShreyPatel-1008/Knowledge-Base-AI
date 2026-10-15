# KnowledgeBase AI

> An AI-powered personal knowledge assistant — upload documents, ask questions, get answers with source citations using RAG.

## Tech Stack

| Layer       | Technology                        |
| ----------- | --------------------------------- |
| Frontend    | React (Vite) + Tailwind CSS      |
| Backend     | Node.js + Express (ES modules)   |
| Database    | MongoDB 7 (Mongoose)             |
| Vector DB   | Qdrant                           |
| LLM / Embed | Google Gemini 2.5 Flash / gemini-embedding-001 |

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d
```

This boots **MongoDB** on `localhost:27017` and **Qdrant** on `localhost:6333`.

### 2. Configure the backend

```bash
cd server
cp .env.example .env        # then fill in your GEMINI_API_KEY & JWT_SECRET
npm install
npm run dev                  # starts on http://localhost:5000
```

### 3. Configure the frontend _(coming in Step 7)_

```bash
cd client
npm install
npm run dev                  # starts on http://localhost:5173
```

## Project Structure

```
/client          → React (Vite) frontend
/server
  /src
    /config      → env loader, DB connection
    /controllers → route handlers
    /middleware   → auth guard, error handler
    /models      → Mongoose schemas
    /routes      → Express routers
    /services    → business logic (Gemini, Qdrant, chunking)
    /utils       → helpers (ApiError, etc.)
/docker-compose.yml
```

## API Endpoints (so far)

| Method | Path           | Description          |
| ------ | -------------- | -------------------- |
| GET    | `/api/health`  | Health check         |

_More endpoints will be added with each step._
