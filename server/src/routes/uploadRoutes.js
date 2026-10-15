import { Router } from "express";
import { uploadFile } from "../middleware/upload.js";
import { uploadDocument } from "../controllers/uploadController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Protect upload endpoint
router.post("/", authenticate, uploadFile, uploadDocument);

export default router;
