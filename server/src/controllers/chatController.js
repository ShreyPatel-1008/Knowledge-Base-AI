import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { Document } from "../models/Document.js";
import { Chunk } from "../models/Chunk.js";
import { rewriteQuery } from "../services/queryRewriterService.js";
import { hybridSearch } from "../services/hybridSearchService.js";
import { rerankChunks } from "../services/rerankerService.js";
import { streamChatWithContext } from "../services/llmService.js";
import {
  getRelevantMemories,
  extractAndSaveMemories,
} from "../services/memoryService.js";

/**
 * POST /api/chat
 * Phase 5B: Supports documentId scoping (chat scoped to a single document).
 */
export async function streamChat(req, res, next) {
  try {
    const { question, chatId, documentId } = req.body;
    const userId = req.user._id;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: "Question is required." });
    }

    // Document scoping verification & smart intent auto-resolution
    let scopedDocId = documentId || null;
    let scopedDocName = null;

    if (scopedDocId) {
      const doc = await Document.findOne({ _id: scopedDocId, userId });
      if (doc) scopedDocName = doc.filename;
    } else {
      // Auto-resolve if user question specifically references a document type or title
      const qLower = question.toLowerCase();
      const isVideoIntent = /\b(youtube|yt|video|transcript|clip)\b/i.test(qLower);
      const isUrlIntent = /\b(url|link|webpage|web page|website)\b/i.test(qLower);

      const userDocs = await Document.find({ userId, status: "ready" }).sort({ updatedAt: -1 }).lean();

      if (isVideoIntent && userDocs.length > 0) {
        const ytDocs = userDocs.filter((d) => d.type === "youtube" || /youtube|video/i.test(d.filename));
        if (ytDocs.length > 0) {
          // If query mentions part of a title, pick that one; otherwise prioritize the substantive tutorial/video
          const matched = ytDocs.find((d) => {
            const words = d.filename.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
            return words.some((w) => qLower.includes(w));
          });
          // If not explicitly matched by title words, pick the longest/most substantial video or latest
          const chosen = matched || (ytDocs.sort((a, b) => (b.chunkCount || 0) - (a.chunkCount || 0))[0]);
          scopedDocId = chosen._id;
          scopedDocName = chosen.filename;
          console.log(`🎯  [Smart Routing] Auto-scoped query to YouTube document: "${scopedDocName}"`);
        }
      } else if (isUrlIntent && userDocs.length > 0) {
        const urlDocs = userDocs.filter((d) => d.type === "web" || d.type === "url" || /http|www/i.test(d.filename));
        if (urlDocs.length > 0) {
          scopedDocId = urlDocs[0]._id;
          scopedDocName = urlDocs[0].filename;
          console.log(`🎯  [Smart Routing] Auto-scoped query to Web/URL document: "${scopedDocName}"`);
        }
      } else if (userDocs.length > 0) {
        // Check if query directly references any document's title
        const matched = userDocs.find((d) => {
          const titleBase = d.filename.toLowerCase().replace(/\.[a-z0-9]+$/i, "");
          return titleBase.length > 3 && qLower.includes(titleBase);
        });
        if (matched) {
          scopedDocId = matched._id;
          scopedDocName = matched.filename;
          console.log(`🎯  [Smart Routing] Auto-scoped query to document: "${scopedDocName}"`);
        }
      }
    }

    // 1. Get or create conversation session owned by user
    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId });
    }
    if (!chat) {
      const prefix = scopedDocName ? `[${scopedDocName}] ` : "";
      chat = await Chat.create({
        userId,
        title: `${prefix}${question.trim().slice(0, 35)}…`,
      });
    }

    // 2. Fetch last 6 messages owned by user for follow-up context
    const recentMessages = await Message.find({ chatId: chat._id, userId })
      .sort({ createdAt: -1 })
      .limit(6);
    recentMessages.reverse();

    // 3. Set SSE response headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // 3B. Retrieve user's active long-term memories & preferences
    const userMemories = await getRelevantMemories(userId, 10);

    // 4. Query Rewriting: formulate standalone search query
    const effectiveQuery = await rewriteQuery(question, recentMessages);

    // 5. Hybrid Search or Overview Timeline Sampling
    const isOverviewIntent = /\b(explain|summarize|summary|overview|what is (this|the)|tell me about|walk me through|breakdown|whole|entire|all)\b/i.test(question);
    let candidates = [];

    if (scopedDocId && isOverviewIntent) {
      // Fetch timeline milestone chunks across the document (intro, early, middle, late, conclusion)
      const totalDocChunks = await Chunk.countDocuments({ documentId: scopedDocId, userId });
      if (totalDocChunks > 0) {
        const sampleIndices = [];
        if (totalDocChunks <= 8) {
          for (let i = 0; i < totalDocChunks; i++) sampleIndices.push(i);
        } else {
          sampleIndices.push(0, 1); // intro
          sampleIndices.push(Math.floor(totalDocChunks * 0.25));
          sampleIndices.push(Math.floor(totalDocChunks * 0.50));
          sampleIndices.push(Math.floor(totalDocChunks * 0.75));
          sampleIndices.push(totalDocChunks - 1); // conclusion
        }
        const timelineChunks = await Chunk.find({
          documentId: scopedDocId,
          userId,
          chunkIndex: { $in: sampleIndices },
        })
          .sort({ chunkIndex: 1 })
          .lean();

        candidates = timelineChunks.map((c, i) => ({
          documentId: String(c.documentId),
          filename: c.filename,
          page: c.page || 1,
          chunkIndex: c.chunkIndex,
          text: c.text,
          rrfScore: 0.1 - i * 0.01,
          appearances: 2,
        }));
      }
    }

    if (candidates.length === 0) {
      console.log(
        `🔎  [Hybrid Search] Query: "${effectiveQuery}" ${scopedDocName ? `[Scoped to ${scopedDocName}]` : ""}`
      );
      candidates = await hybridSearch(
        effectiveQuery,
        userId,
        20,
        scopedDocId || null
      );
    }

    // 6. Cross-Encoder Re-ranking: pick best 5 from top 20
    const bestChunks = await rerankChunks(effectiveQuery, candidates, 5);

    // Format sources
    const sources = (bestChunks || []).map((r) => ({
      filename: r.filename,
      chunkPreview: r.text ? r.text.slice(0, 220) + "…" : "",
      page: r.page || 1,
      chunkIndex: r.chunkIndex,
      score: r.rerankScore ? Math.round(r.rerankScore * 10) / 10 : Math.round((r.rrfScore || 0) * 100) / 100,
      documentId: r.documentId,
    }));

    // Send initialization event
    res.write(
      `data: ${JSON.stringify({
        type: "init",
        chatId: chat._id,
        sources,
        scopedDocument: scopedDocName,
        rewrittenQuery: effectiveQuery !== question ? effectiveQuery : null,
      })}\n\n`
    );

    // If no context found in user's documents
    if (!bestChunks || bestChunks.length === 0) {
      const fallbackText = scopedDocName
        ? `I couldn't find this in "${scopedDocName}".`
        : "I couldn't find this in your documents.";

      res.write(
        `data: ${JSON.stringify({
          type: "token",
          token: fallbackText,
        })}\n\n`
      );

      await Message.create({ chatId: chat._id, userId, role: "user", content: question });
      await Message.create({
        chatId: chat._id,
        userId,
        role: "assistant",
        content: fallbackText,
        sources: [],
      });

      // Background Long-term Memory Extraction
      extractAndSaveMemories({
        userId,
        userMessage: question,
        assistantMessage: fallbackText,
        chatId: chat._id,
      }).catch((err) => console.error("Memory extraction error:", err.message));

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          answer: fallbackText,
          sources: [],
          chatId: chat._id,
        })}\n\n`
      );
      return res.end();
    }

    // 7. Stream LLM response honoring user's long-term memory & preferences
    const stream = await streamChatWithContext(
      question,
      bestChunks,
      recentMessages,
      userMemories
    );
    let fullAnswer = "";

    for await (const chunk of stream) {
      const token = chunk.text();
      fullAnswer += token;
      res.write(
        `data: ${JSON.stringify({
          type: "token",
          token,
        })}\n\n`
      );
    }

    // 8. Persist user and assistant messages
    await Message.create({
      chatId: chat._id,
      userId,
      role: "user",
      content: question,
    });

    await Message.create({
      chatId: chat._id,
      userId,
      role: "assistant",
      content: fullAnswer,
      sources,
    });

    // 8B. Background Long-term Memory Extraction & Deduplication
    extractAndSaveMemories({
      userId,
      userMessage: question,
      assistantMessage: fullAnswer,
      chatId: chat._id,
    }).catch((err) => console.error("Memory extraction error:", err.message));

    // 9. Send completion event
    res.write(
      `data: ${JSON.stringify({
        type: "done",
        answer: fullAnswer,
        sources,
        chatId: chat._id,
      })}\n\n`
    );

    res.end();
  } catch (err) {
    console.error("❌ Chat streaming error:", err);
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: err.message || "An error occurred while generating the answer.",
        })}\n\n`
      );
      res.end();
    }
  }
}

/**
 * GET /api/chat/messages/:chatId
 */
export async function getChatMessages(req, res, next) {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    const messages = await Message.find({ chatId, userId: req.user._id }).sort({
      createdAt: 1,
    });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chat/active
 */
export async function getActiveChat(req, res, next) {
  try {
    let chat = await Chat.findOne({ userId: req.user._id }).sort({ updatedAt: -1 });
    if (!chat) {
      chat = await Chat.create({ userId: req.user._id, title: "New Conversation" });
    }
    const messages = await Message.find({
      chatId: chat._id,
      userId: req.user._id,
    }).sort({ createdAt: 1 });
    res.json({ success: true, chat, messages });
  } catch (err) {
    next(err);
  }
}
