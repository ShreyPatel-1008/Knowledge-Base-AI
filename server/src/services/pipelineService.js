import { Document } from "../models/Document.js";
import { Chunk } from "../models/Chunk.js";
import { chunkText } from "./chunkingService.js";
import { embedTexts } from "./embeddingService.js";
import { generateSummaryAndTags } from "./summaryService.js";
import { computeAverageEmbedding } from "../utils/mathUtils.js";
import { ensureCollection, upsertChunks } from "./qdrantService.js";

/**
 * Unified text chunk, embed, store, and summarization pipeline.
 * Used identically for uploaded documents, web pages, and YouTube transcripts.
 *
 * @param {Object} params
 * @param {string} params.docId - Mongoose Document ID
 * @param {string} params.userId - Owner user ID
 * @param {string} params.text - Full extracted text
 * @param {string} params.sourceName - Display name / title
 * @param {string} params.sourceType - "pdf" | "docx" | "txt" | "md" | "web" | "youtube"
 * @param {string} [params.sourceUrl] - Original source URL if applicable
 * @param {number} [params.pages=1] - Estimated or actual page count
 */
export async function processTextPipeline({
  docId,
  userId,
  text,
  sourceName,
  sourceType = "file",
  sourceUrl = null,
  pages = 1,
}) {
  try {
    console.log(`⏳  [Pipeline] Starting ingestion for "${sourceName}" [${sourceType}]...`);

    if (!text || text.trim().length === 0) {
      throw new Error("No readable text content provided to pipeline.");
    }

    // 1. Recursive semantic chunking
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("Document produced 0 text chunks.");
    }
    console.log(`   [Pipeline] Generated ${chunks.length} semantic chunks`);

    // 2. Dense embeddings -> Qdrant vector database
    const embeddings = await embedTexts(chunks);
    await ensureCollection();
    await upsertChunks(chunks, embeddings, {
      documentId: docId,
      userId,
      filename: sourceName,
      pages,
      sourceType,
      sourceUrl,
    });

    // 3. Sparse full-text indexing -> MongoDB Chunk collection
    await Chunk.deleteMany({ documentId: docId });
    const chunkDocs = chunks.map((chunk, i) => {
      const estimatedPage =
        pages > 1
          ? Math.min(Math.floor((i / chunks.length) * pages) + 1, pages)
          : 1;

      return {
        userId,
        documentId: docId,
        filename: sourceName,
        chunkIndex: i,
        page: estimatedPage,
        text: chunk,
        sourceType,
        sourceUrl,
      };
    });
    await Chunk.insertMany(chunkDocs);

    // 4. Compute average mean embedding vector across all chunks for knowledge graph
    const averageEmbedding = computeAverageEmbedding(embeddings);

    // 5. Auto-summary (3 sentences) & 5 topic tags via LLM
    console.log(`   [Pipeline] Generating summary & topic tags for "${sourceName}"...`);
    const { summary, tags } = await generateSummaryAndTags(text, sourceName);

    // 6. Update Document model status to "ready"
    await Document.findByIdAndUpdate(docId, {
      status: "ready",
      chunkCount: chunks.length,
      embedding: averageEmbedding,
      summary,
      tags,
      errorMessage: null,
    });

    console.log(`✅  [Pipeline] Ingestion completed successfully for "${sourceName}".`);
  } catch (err) {
    console.error(`❌  [Pipeline] Ingestion failed for "${sourceName}":`, err.message);
    await Document.findByIdAndUpdate(docId, {
      status: "failed",
      errorMessage: err.message,
    });
  }
}
