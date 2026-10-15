import { Chunk } from "../models/Chunk.js";
import { Document } from "../models/Document.js";
import { generateQuizAndFlashcards } from "../services/quizService.js";

/**
 * Generate 10 MCQs and 10 Flashcards for a specific document or tag
 * POST /api/study/generate
 */
export async function generateStudySet(req, res, next) {
  try {
    const { documentId, tag } = req.body;
    const userId = req.user._id;

    if (!documentId && !tag) {
      return res.status(400).json({
        success: false,
        message: "Please provide either a documentId or a tag to generate study materials.",
      });
    }

    let chunks = [];
    let sourceName = "";

    if (documentId) {
      const doc = await Document.findOne({ _id: documentId, userId });
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: "Document not found or access denied.",
        });
      }
      if (doc.status !== "ready") {
        return res.status(400).json({
          success: false,
          message: `Document is not ready yet (current status: ${doc.status}).`,
        });
      }

      sourceName = doc.filename;
      chunks = await Chunk.find({ documentId: doc._id, userId })
        .sort({ chunkIndex: 1 })
        .limit(25)
        .lean();
    } else if (tag) {
      const docs = await Document.find({
        userId,
        tags: tag,
        status: "ready",
      }).select("_id filename");

      if (!docs.length) {
        return res.status(404).json({
          success: false,
          message: `No ready documents found with tag "${tag}".`,
        });
      }

      sourceName = `Tag: #${tag} (${docs.map((d) => d.filename).join(", ")})`;
      const docIds = docs.map((d) => d._id);

      // Distribute chunk retrieval across tagged documents
      chunks = await Chunk.find({
        documentId: { $in: docIds },
        userId,
      })
        .sort({ chunkIndex: 1 })
        .limit(30)
        .lean();
    }

    if (!chunks.length) {
      return res.status(400).json({
        success: false,
        message: "No document text chunks available to generate study questions.",
      });
    }

    const studySet = await generateQuizAndFlashcards(chunks, sourceName);

    return res.json({
      success: true,
      data: studySet,
    });
  } catch (err) {
    next(err);
  }
}
