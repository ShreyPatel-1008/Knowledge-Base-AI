import { Router } from "express";
import {
  listDocuments,
  deleteDocument,
  reindexDocument,
  getRelatedDocuments,
  getKnowledgeGraph,
} from "../controllers/uploadController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Protect all document management endpoints
router.use(authenticate);

// GET /api/documents — list documents (supports ?tag=)
router.get("/", listDocuments);

// GET /api/documents/graph — knowledge graph nodes and similarity edges
router.get("/graph", getKnowledgeGraph);

// GET /api/documents/:id/related — top 3 similar documents
router.get("/:id/related", getRelatedDocuments);

// DELETE /api/documents/:id
router.delete("/:id", deleteDocument);

// POST /api/documents/:id/reindex
router.post("/:id/reindex", reindexDocument);

export default router;
