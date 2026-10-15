import { Chunk } from "../models/Chunk.js";
import { searchSimilar } from "./qdrantService.js";
import { embedText } from "./embeddingService.js";

/**
 * Reciprocal Rank Fusion (RRF) algorithm.
 *
 * @param {Array<Array<Object>>} rankings - Array of ranked chunk arrays
 * @param {number} k - Smoothing constant (default 60)
 * @returns {Array<Object>} Combined and sorted chunks with rrfScore
 */
export function reciprocalRankFusion(rankings, k = 60) {
  const scoreMap = new Map();

  rankings.forEach((list) => {
    list.forEach((item, index) => {
      const rank = index + 1; // 1-based rank
      const key = `${item.documentId || item.payload?.documentId}_${item.chunkIndex ?? item.payload?.chunkIndex}`;

      const text = item.text || item.payload?.text;
      const filename = item.filename || item.payload?.filename;
      const page = item.page || item.payload?.page || 1;
      const documentId = item.documentId || item.payload?.documentId;
      const chunkIndex = item.chunkIndex ?? item.payload?.chunkIndex;

      const rrfContribution = 1 / (k + rank);

      if (scoreMap.has(key)) {
        const existing = scoreMap.get(key);
        existing.rrfScore += rrfContribution;
        existing.appearances += 1;
        existing.ranks.push(rank);
      } else {
        scoreMap.set(key, {
          key,
          documentId: String(documentId),
          filename,
          page,
          chunkIndex,
          text,
          rrfScore: rrfContribution,
          appearances: 1,
          ranks: [rank],
          originalScore: item.score || 0,
        });
      }
    });
  });

  return Array.from(scoreMap.values()).sort(
    (a, b) => b.rrfScore - a.rrfScore
  );
}

/**
 * Execute Hybrid Search combining dense vectors and sparse text search.
 * Supports optional documentId scoping.
 *
 * @param {string} query - The search query
 * @param {string} userId - Authenticated user ID
 * @param {number} topK - Candidates to return (default 20)
 * @param {string} documentId - Optional documentId to scope search
 * @returns {Promise<Array<Object>>}
 */
export async function hybridSearch(query, userId, topK = 20, documentId = null) {
  // 1. Vector Search
  const queryVector = await embedText(query);
  const vectorResultsPromise = searchSimilar(
    queryVector,
    topK,
    userId,
    documentId
  ).catch((err) => {
    console.warn("⚠️  Vector search error in hybrid:", err.message);
    return [];
  });

  // 2. Keyword Search in MongoDB Text Index
  // Strip conversational/meta query words that distract sparse text search
  const META_WORDS = new Set([
    "explain", "explaining", "explained", "explanation",
    "summary", "summarize", "summarizing", "overview",
    "tell", "showing", "give", "describe", "details",
    "please", "about", "what", "which", "where", "whole", "entire",
    "video", "videos", "youtube", "yt", "url", "link", "webpage",
    "from", "with", "this", "that", "these", "those", "how", "does"
  ]);

  const rawWords = query
    .replace(/[^\w\s\u0900-\u097F]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const filteredWords = rawWords.filter((w) => !META_WORDS.has(w.toLowerCase()));
  const termsToSearch = filteredWords.length > 0 ? filteredWords : rawWords;
  const cleanTerms = termsToSearch.join(" ");

  const keywordFilter = { userId };
  if (documentId) {
    keywordFilter.documentId = documentId;
  }

  let keywordResultsPromise = Promise.resolve([]);
  if (cleanTerms && cleanTerms.trim().length > 0) {
    keywordFilter.$text = { $search: cleanTerms };
    keywordResultsPromise = Chunk.find(keywordFilter, {
      score: { $meta: "textScore" },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(topK)
      .lean()
      .catch((err) => {
        console.warn("⚠️  Keyword search error in hybrid:", err.message);
        return [];
      });
  }

  const [vectorHits, keywordHits] = await Promise.all([
    vectorResultsPromise,
    keywordResultsPromise,
  ]);

  const normalizedVectorHits = (vectorHits || []).map((v) => ({
    documentId: v.payload.documentId,
    filename: v.payload.filename,
    page: v.payload.page,
    chunkIndex: v.payload.chunkIndex,
    text: v.payload.text,
    score: v.score,
    source: "vector",
  }));

  const normalizedKeywordHits = (keywordHits || []).map((k) => ({
    documentId: String(k.documentId),
    filename: k.filename,
    page: k.page,
    chunkIndex: k.chunkIndex,
    text: k.text,
    score: k.score,
    source: "keyword",
  }));

  const mergedResults = reciprocalRankFusion(
    [normalizedVectorHits, normalizedKeywordHits],
    60
  );

  // If scoped to a specific document and search returned few candidates,
  // backfill with sequential chunks from that document so coverage is complete
  if (documentId && mergedResults.length < 5) {
    const backfillChunks = await Chunk.find({ documentId, userId })
      .sort({ chunkIndex: 1 })
      .limit(topK)
      .lean()
      .catch(() => []);

    for (const bf of backfillChunks) {
      if (!mergedResults.some((r) => r.chunkIndex === bf.chunkIndex && String(r.documentId) === String(bf.documentId))) {
        mergedResults.push({
          key: `${bf.documentId}_${bf.chunkIndex}`,
          documentId: String(bf.documentId),
          filename: bf.filename,
          page: bf.page || 1,
          chunkIndex: bf.chunkIndex,
          text: bf.text,
          rrfScore: 0.01,
          appearances: 1,
          ranks: [99],
          originalScore: 0,
        });
      }
    }
  }

  return mergedResults.slice(0, topK);
}
