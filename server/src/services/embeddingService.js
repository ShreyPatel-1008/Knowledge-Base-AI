import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey || "placeholder");
const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

/**
 * Embed a single text string.
 * @param {string} text
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
export async function embedText(text) {
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  });
  return result.embedding.values;
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
    console.warn("Embedding service unavailable. Indexing for keyword search only.");
    return [];
  }
}
