import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { ingestUrl } from "../controllers/ingestController.js";

const router = Router();

// Protect all ingest routes with authentication
router.use(authenticate);

// POST /api/ingest/url
router.post("/url", ingestUrl);

export default router;
