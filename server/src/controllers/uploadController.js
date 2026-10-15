import fs from "fs/promises";
import path from "path";
import { Document } from "../models/Document.js";
import { Message } from "../models/Message.js";
import { Chunk } from "../models/Chunk.js";
import { getFileType, parseDocument } from "../services/parserService.js";
import { chunkText } from "../services/chunkingService.js";
import { embedTexts } from "../services/embeddingService.js";
import { generateSummaryAndTags } from "../services/summaryService.js";
import { computeAverageEmbedding, cosineSimilarity } from "../utils/mathUtils.js";
import {
  ensureCollection,
  upsertChunks,
  deleteDocumentVectors,
} from "../services/qdrantService.js";
import { processTextPipeline } from "../services/pipelineService.js";
import { ingestUrlContent } from "../services/urlIngestService.js";

/**
 * Background worker to process & index a document:
 * 1. Parse text & page count
 * 2. Recursive structure-aware chunking
 * 3. Dense embeddings -> Qdrant
 * 4. Sparse full-text indexing -> MongoDB Chunk model
 * 5. Compute document mean embedding vector for knowledge graph & similarity
 * 6. Background LLM 3-sentence summary & 5 topic tags
 */
async function processDocumentAsync(docId, userId, filePath, fileType, originalname) {
  try {
    console.log(`⏳  [Async] Processing doc ${docId} ("${originalname}") for user ${userId}...`);

    // 1. Parse text & page count
    const { text, pages } = await parseDocument(filePath, fileType);

    // 2. Delegate to unified chunk/embed/store pipeline
    await processTextPipeline({
      docId,
      userId,
      text,
      sourceName: originalname,
      sourceType: fileType,
      pages,
    });
  } catch (err) {
    console.error(`❌  [Async] Indexing error for doc ${docId}:`, err.message);
    await Document.findByIdAndUpdate(docId, {
      status: "failed",
      errorMessage: err.message,
    });
  }
}

/**
 * POST /api/upload
 */
export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document file uploaded. Supported: .pdf, .docx, .txt, .md",
      });
    }

    const fileType = getFileType(req.file.originalname);
    if (!fileType) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        message: "Unsupported file type. Use PDF, DOCX, TXT, or Markdown (.md)",
      });
    }

    const storageDir = path.join("uploads", "documents");
    await fs.mkdir(storageDir, { recursive: true });

    const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storagePath = path.join(storageDir, safeName);
    await fs.rename(req.file.path, storagePath);

    const doc = await Document.create({
      userId: req.user._id,
      filename: req.file.originalname,
      type: fileType,
      size: req.file.size,
      storagePath,
      status: "processing",
      chunkCount: 0,
    });

    // Run async background processing
    processDocumentAsync(
      doc._id,
      req.user._id,
      storagePath,
      fileType,
      req.file.originalname
    );

    res.status(202).json({
      success: true,
      message: `Document "${req.file.originalname}" uploaded and queued for processing.`,
      document: doc,
    });
  } catch (err) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
}

/**
 * GET /api/documents
 */
export async function listDocuments(req, res, next) {
  try {
    const filter = { userId: req.user._id };
    if (req.query.tag && req.query.tag !== "All") {
      filter.tags = req.query.tag;
    }

    const documents = await Document.find(filter).sort({
      createdAt: -1,
    });
    res.json({
      success: true,
      documents,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/:id/related
 * Returns top 3 most similar documents based on average embedding cosine similarity
 */
export async function getRelatedDocuments(req, res, next) {
  try {
    const { id } = req.params;

    const targetDoc = await Document.findOne({
      _id: id,
      userId: req.user._id,
    }).select("+embedding");

    if (!targetDoc) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied.",
      });
    }

    if (!targetDoc.embedding || targetDoc.embedding.length === 0) {
      return res.json({
        success: true,
        target: { id: targetDoc._id, filename: targetDoc.filename },
        related: [],
      });
    }

    // Find all other ready documents for this user
    const otherDocs = await Document.find({
      _id: { $ne: targetDoc._id },
      userId: req.user._id,
      status: "ready",
    }).select("+embedding");

    const scored = otherDocs
      .filter((d) => d.embedding && d.embedding.length > 0)
      .map((d) => {
        const similarity = cosineSimilarity(targetDoc.embedding, d.embedding);
        return {
          _id: d._id,
          filename: d.filename,
          type: d.type,
          size: d.size,
          summary: d.summary,
          tags: d.tags,
          chunkCount: d.chunkCount,
          similarityScore: Math.round(similarity * 100) / 100,
        };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3); // Top 3 similar documents

    res.json({
      success: true,
      target: {
        id: targetDoc._id,
        filename: targetDoc.filename,
        summary: targetDoc.summary,
        tags: targetDoc.tags,
      },
      related: scored,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/documents/graph
 * Returns graph representation (nodes and similarity links) for knowledge graph visualization
 */
export async function getKnowledgeGraph(req, res, next) {
  try {
    const docs = await Document.find({
      userId: req.user._id,
      status: "ready",
    }).select("+embedding");

    const nodes = docs.map((d) => ({
      id: String(d._id),
      name: d.filename,
      type: d.type,
      size: d.size,
      summary: d.summary,
      tags: d.tags || [],
      chunkCount: d.chunkCount || 1,
    }));

    const links = [];
    const SIMILARITY_THRESHOLD = 0.35; // Connection threshold

    for (let i = 0; i < docs.length; i++) {
      const docA = docs[i];
      if (!docA.embedding || docA.embedding.length === 0) continue;

      for (let j = i + 1; j < docs.length; j++) {
        const docB = docs[j];
        if (!docB.embedding || docB.embedding.length === 0) continue;

        const sim = cosineSimilarity(docA.embedding, docB.embedding);
        if (sim >= SIMILARITY_THRESHOLD) {
          links.push({
            source: String(docA._id),
            target: String(docB._id),
            similarity: Math.round(sim * 100) / 100,
            value: Math.max(1, Math.round(sim * 5)), // Line thickness
          });
        }
      }
    }

    res.json({
      success: true,
      graph: {
        nodes,
        links,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/documents/:id
 */
export async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;

    const doc = await Document.findOne({ _id: id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied.",
      });
    }

    await deleteDocumentVectors(id, req.user._id);
    await Chunk.deleteMany({ documentId: id, userId: req.user._id });

    if (doc.storagePath) {
      await fs.unlink(doc.storagePath).catch(() => {});
    }

    await Message.updateMany(
      { userId: req.user._id, "sources.documentId": String(id) },
      { $pull: { sources: { documentId: String(id) } } }
    );

    await Document.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Document "${doc.filename}", its vector index, and related chat references deleted.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/documents/:id/reindex
 */
export async function reindexDocument(req, res, next) {
  try {
    const { id } = req.params;

    const doc = await Document.findOne({ _id: id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found or access denied.",
      });
    }

    // Handle web or YouTube re-indexing
    if (doc.type === "web" || doc.type === "youtube") {
      doc.status = "processing";
      doc.errorMessage = null;
      await doc.save();

      await deleteDocumentVectors(id, req.user._id);
      await Chunk.deleteMany({ documentId: id, userId: req.user._id });

      (async () => {
        try {
          const content = await ingestUrlContent(doc.sourceUrl);
          await processTextPipeline({
            docId: doc._id,
            userId: req.user._id,
            text: content.text,
            sourceName: content.title || doc.filename,
            sourceType: content.sourceType,
            sourceUrl: doc.sourceUrl,
          });
        } catch (err) {
          await Document.findByIdAndUpdate(doc._id, {
            status: "failed",
            errorMessage: err.message,
          });
        }
      })();

      return res.status(202).json({
        success: true,
        message: `Re-indexing initiated for "${doc.filename}".`,
        document: doc,
      });
    }

    try {
      await fs.access(doc.storagePath);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Original document file is no longer available on disk.",
      });
    }

    doc.status = "processing";
    doc.errorMessage = null;
    await doc.save();

    await deleteDocumentVectors(id, req.user._id);
    await Chunk.deleteMany({ documentId: id, userId: req.user._id });

    processDocumentAsync(
      doc._id,
      req.user._id,
      doc.storagePath,
      doc.type,
      doc.filename
    );

    res.status(202).json({
      success: true,
      message: `Re-indexing initiated for "${doc.filename}".`,
      document: doc,
    });
  } catch (err) {
    next(err);
  }
}
