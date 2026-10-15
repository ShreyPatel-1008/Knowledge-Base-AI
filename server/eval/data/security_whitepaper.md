# KnowledgeBase Security Whitepaper

## 1. Authentication & Session Management
The API requires JWT Bearer tokens passed via the HTTP Authorization header. All protected endpoints verify the token signature against an HMAC secret key.

## 2. Password Security Standards
Passwords must be at least 6 characters in length and are salted and hashed using bcrypt with a cost factor of 10 prior to database persistence.

## 3. Multi-Tenant Data & Vector Isolation
Every vector point includes a userId in its payload, and all search queries inject a mandatory filter matching the authenticated user's ID. Users can never retrieve, view, or mutate vectors belonging to other accounts.

## 4. Rate Limiting & Denial of Service Protection
Authentication endpoints are restricted to 30 requests per 15-minute window via express-rate-limit. General API endpoints allow up to 300 requests per 15-minute window.

## 5. Deletion & Data Purge Policy
When a user deletes a document, the document's vectors are purged from Qdrant, the physical file is unlinked from disk, and references are removed from chat messages.
