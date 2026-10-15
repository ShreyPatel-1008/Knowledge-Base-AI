# KnowledgeBase AI Architecture Specification

## 1. System Overview
KnowledgeBase AI is an enterprise document assistant providing grounded question answering over multi-format documents.

## 2. File Ingestion & Format Support
The system supports PDF, DOCX (Microsoft Word), plain text (TXT), and Markdown (MD) files up to 10 MB. Ingestion parses text, applies recursive structure-aware chunking, and indexes both vectors and keywords.

## 3. Retrieval & Vector Database
Qdrant vector database is used with Cosine distance metric and 768-dimensional vectors. Embeddings are generated using the Google text-embedding-004 model generating 768-dimensional embedding vectors.

## 4. Hybrid Search & RRF Mechanics
Hybrid search retrieves the top 20 candidate chunks combining vector and keyword ranks. The smoothing constant k is set to 60 for reciprocal rank fusion scoring across dense and sparse ranking lists.

## 5. Cross-Encoder Re-Ranking
The cross-encoder re-ranker selects the top 5 most relevant chunks from the 20 candidates using joint attention scoring.

## 6. Conversational Memory & Query Rewriting
Query rewriting reformulates follow-up queries into self-contained standalone search queries resolving pronouns and context. Temperature is set to 0.1 to maximize factual precision and minimize hallucinations.
