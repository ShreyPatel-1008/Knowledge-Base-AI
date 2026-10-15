import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getMemories,
  createMemory,
  deleteMemory,
  clearAllMemories,
} from "../controllers/memoryController.js";

const router = Router();

// Protect all memory endpoints
router.use(authenticate);

// GET /api/memories - List all memories
router.get("/", getMemories);

// POST /api/memories - Add manual memory
router.post("/", createMemory);

// DELETE /api/memories/:id - Delete a memory
router.delete("/:id", deleteMemory);

// DELETE /api/memories - Clear all memories
router.delete("/", clearAllMemories);

export default router;
