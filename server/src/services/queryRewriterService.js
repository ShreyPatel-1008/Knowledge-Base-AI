import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Rephrase conversational follow-up questions into standalone queries
 * before running retrieval.
 *
 * @param {string} question - Current follow-up question
 * @param {Array<Object>} recentMessages - Chat history [{ role, content }]
 * @returns {Promise<string>} Standalone rewritten question
 */
export async function rewriteQuery(question, recentMessages = []) {
  if (!recentMessages || recentMessages.length === 0) {
    return question.trim();
  }

  const historyContext = recentMessages
    .slice(-4) // Last 4 messages are sufficient for coreference
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `You are an expert query reformulation assistant for a document retrieval engine.
Given the recent chat history and a user's follow-up question, rewrite the question into a clear, standalone search query.

Rules:
1. Resolve pronouns (e.g. "it", "they", "this", "that", "the company", "the contract") with the specific entity mentioned in history.
2. Preserve the user's original intent without adding or hallucinating new constraints.
3. Do NOT answer the question. Only output the rewritten search query.
4. If the question is already completely standalone and self-contained, output it unchanged.
5. Return ONLY the rewritten query text. Do not include quotes, preamble, or explanations.

## Conversation History:
${historyContext}

## Follow-up Question:
${question}

## Standalone Search Query:`;

  try {
    const result = await model.generateContent(prompt);
    const rewritten = result.response.text().trim();
    if (rewritten && rewritten.length > 3) {
      console.log(`🔄  Query rewritten: "${question}" ➔ "${rewritten}"`);
      return rewritten;
    }
    return question.trim();
  } catch (err) {
    console.warn("⚠️  Query rewriting failed, using original query:", err.message);
    return question.trim();
  }
}
