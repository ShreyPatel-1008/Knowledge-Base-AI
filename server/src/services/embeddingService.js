import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey || "placeholder");
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

/**
 * Deterministic 768-dimensional fallback embedding generator
 * Used if API key is invalid/rate-limited in local dev/testing
 */
function fallbackEmbedding(text) {
  const vec = new Array(768).fill(0);
  const words = text.toLowerCase().split(/\W+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let hash = 0;
    for (let j = 0; j < w.length; j++) {
      hash = (hash << 5) - hash + w.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 768;
    vec[idx] += 1;
  }
  const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vec.map((v) => v / mag);
}

/**
 * Embed a single text string.
 * @param {string} text
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
export async function embedText(text) {
  try {
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    });
    return result.embedding.values;
  } catch (err) {
    console.warn("⚠️  Gemini embedding error, using fallback embeddings:", err.message);
    return fallbackEmbedding(text);
  }
}

/**
 * Embed multiple texts in batches.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function embedTexts(texts) {
  try {
    const BATCH_SIZE = 100;
    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      const result = await model.batchEmbedContents({
        requests: batch.map((text) => ({
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        })),
      });

      allEmbeddings.push(...result.embeddings.map((e) => e.values));

      if (i + BATCH_SIZE < texts.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return allEmbeddings;
  } catch (err) {
    console.warn("⚠️  Gemini batch embedding error, using fallback embeddings:", err.message);
    return texts.map((t) => fallbackEmbedding(t));
  }
}
