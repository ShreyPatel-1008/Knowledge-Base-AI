import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";
import config from "../config/index.js";

const client = new QdrantClient({ url: config.qdrantUrl });
const COLLECTION = config.qdrantCollection;
const VECTOR_SIZE = 768; // text-embedding-004

/**
 * Ensure collection exists with Cosine distance.
 */
export async function ensureCollection() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION);

    if (!exists) {
      await client.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: "Cosine" },
      });
      console.log(`✅  Qdrant collection "${COLLECTION}" created`);
    }
  } catch (err) {
    console.error("❌  Qdrant ensureCollection error:", err.message);
    throw err;
  }
}

/**
 * Store text chunks + embeddings as Qdrant points with userId isolation.
 *
 * @param {string[]}   chunks     - The text chunks
 * @param {number[][]}  embeddings - Corresponding embedding vectors
 * @param {{ documentId: string, filename: string, pages: number, userId: string }} metadata
 * @returns {Promise<number>} Number of points upserted
 */
export async function upsertChunks(chunks, embeddings, metadata) {
  await ensureCollection();
  const points = chunks.map((chunk, i) => {
    const estimatedPage =
      metadata.pages && metadata.pages > 1
        ? Math.min(Math.floor((i / chunks.length) * metadata.pages) + 1, metadata.pages)
        : 1;

    return {
      id: crypto.randomUUID(),
      vector: embeddings[i],
      payload: {
        userId: String(metadata.userId),
        documentId: String(metadata.documentId),
        filename: metadata.filename,
        chunkIndex: i,
        page: estimatedPage,
        text: chunk,
        sourceType: metadata.sourceType || "file",
        sourceUrl: metadata.sourceUrl || null,
      },
    };
  });

  await client.upsert(COLLECTION, { points });
  return points.length;
}

/**
 * Search for the most similar chunks strictly isolated to a specific userId
 * and optionally scoped to a single documentId.
 *
 * @param {number[]} queryVector - 768-d embedding
 * @param {number}   topK        - Number of results (default 5)
 * @param {string}   userId      - The owner user's ID
 * @param {string}   documentId  - Optional documentId scope
 * @returns {Promise<Array>}
 */
export async function searchSimilar(
  queryVector,
  topK = 5,
  userId = null,
  documentId = null
) {
  try {
    await ensureCollection();
    const queryParams = {
      query: queryVector,
      limit: topK,
      with_payload: true,
    };

    const mustConditions = [];
    if (userId) {
      mustConditions.push({
        key: "userId",
        match: { value: String(userId) },
      });
    }
    if (documentId) {
      mustConditions.push({
        key: "documentId",
        match: { value: String(documentId) },
      });
    }

    if (mustConditions.length > 0) {
      queryParams.filter = { must: mustConditions };
    }

    const response = await client.query(COLLECTION, queryParams);
    return response.points || [];
  } catch (err) {
    if (err.message?.includes("not found") || err.status === 404) {
      return [];
    }
    throw err;
  }
}

/**
 * Delete all vector points for a document belonging to a specific user.
 *
 * @param {string} documentId
 * @param {string} userId
 */
export async function deleteDocumentVectors(documentId, userId) {
  try {
    const mustConditions = [
      { key: "documentId", match: { value: String(documentId) } },
    ];
    if (userId) {
      mustConditions.push({ key: "userId", match: { value: String(userId) } });
    }

    await client.delete(COLLECTION, {
      filter: { must: mustConditions },
    });
  } catch (err) {
    console.error(
      "⚠️  Failed to delete vectors for document:",
      documentId,
      err.message
    );
  }
}
