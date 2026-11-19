import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * LLM-based Cross-Encoder Re-ranker.
 * Evaluates candidate chunks alongside the question using joint attention.
 * Assigns a relevance score (0-10) and filters out noise.
 *
 * @param {string} question - The user's query
 * @param {Array<Object>} candidates - Top ~20 candidates from hybrid search
 * @param {number} topN - Number of top reranked chunks to return (default 5)
 * @returns {Promise<Array<Object>>} Top N re-ranked chunks with rerankScore
 */
export async function rerankChunks(question, candidates, topN = 5) {
  if (!candidates || candidates.length === 0) return [];

  const candidateSnippets = candidates
    .map((c, i) => `[Candidate ${i}]\n${c.text.slice(0, 450)}`)
    .join("\n\n---\n\n");

  const prompt = `You are a precision information retrieval re-ranker.
Evaluate how relevant each candidate chunk is for answering the user's question.

## User Question:
"${question}"

## Candidate Chunks:
${candidateSnippets}

## Instructions:
1. Score each candidate on a scale from 0 to 10:
   - 9-10: Contains direct, complete facts to answer the question.
   - 6-8: Highly relevant context or partial answer.
   - 3-5: Tangentially related or background information.
   - 0-2: Irrelevant or completely unrelated.
2. Return ONLY a valid JSON array of objects with the structure:
   [{"index": 0, "score": 9.5}, {"index": 1, "score": 3.0}, ...]
3. Output no explanation, markdown formatting, or preamble—only the JSON array.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip possible markdown code blocks ```json ... ```
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const scores = JSON.parse(cleaned);

    const scoredMap = new Map();
    for (const item of scores) {
      if (!Number.isInteger(item.index) || item.index < 0 || item.index >= candidates.length ||
          !Number.isFinite(item.score) || item.score < 0 || item.score > 10 || scoredMap.has(item.index)) {
        throw new Error("Invalid candidate score");
      }
      scoredMap.set(item.index, item.score);
    }
    if (scoredMap.size !== candidates.length) throw new Error("Incomplete candidate scores");

    // Attach rerank scores and sort
    const reranked = candidates.map((c, i) => {
      const score = scoredMap.has(i) ? scoredMap.get(i) : 0;
      return {
        ...c,
        rerankScore: score,
      };
    });

    // Sort by rerankScore descending
    reranked.sort((a, b) => b.rerankScore - a.rerankScore);

    // Keep top N, prioritizing items with score >= 3
    const relevant = reranked.filter((c) => c.rerankScore >= 3);
    return relevant.slice(0, topN);
  } catch (err) {
    console.warn("⚠️  Re-ranking failed, falling back to RRF top candidates:", err.message);
    return candidates.slice(0, topN);
  }
}
