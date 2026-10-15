import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { generateStudySet } from "../controllers/studyController.js";

const router = Router();

// All study endpoints require authentication
router.use(authenticate);

// POST /api/study/generate
router.post("/generate", generateStudySet);

export default router;
