import { Router } from "express";
import {
  streamChat,
  getChatMessages,
  getActiveChat,
} from "../controllers/chatController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Protect all chat routes
router.use(authenticate);

// POST /api/chat — SSE streaming chat
router.post("/", streamChat);

// GET /api/chat/active — get or create active conversation for current user
router.get("/active", getActiveChat);

// GET /api/chat/messages/:chatId — get conversation history for current user
router.get("/messages/:chatId", getChatMessages);

export default router;
