import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey || "placeholder");
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.1, // Low temperature for high factual precision & minimal hallucination
  },
});

const SYSTEM_PROMPT = `You are "KnowledgeBase AI", an ultra-precise enterprise knowledge retrieval assistant.

## CORE DIRECTIVES (NON-NEGOTIABLE):
1. **STRICT CONTEXT GROUNDING**:
   - Answer the question relying ONLY and EXCLUSIVELY on the facts provided in the "Retrieved Document Context" below.
   - Do NOT use outside knowledge, world training assumptions, speculation, or unverified extrapolation.

2. **INSUFFICIENT INFORMATION CONSTRAINT**:
   - If the answer to the user's question cannot be found or verified directly in the provided context chunks, you MUST state clearly:
     "I couldn't find this in your documents."
   - Do not attempt to guess, extrapolate, or generate a plausible answer if the context does not state it.

3. **INLINE CITATIONS**:
   - Every factual statement, number, policy, or claim you make MUST include an inline citation citing the document and exact chunk index:
     Format: [Doc: <filename>, chunk #<index>]
   - Example: "The total quarterly revenue was $14.2M [Doc: Q3_Report.pdf, chunk #4]."

4. **CONVERSATIONAL COHERENCE**:
   - Maintain natural dialogue based on recent chat history while strictly preserving factuality.

5. **FORMATTING**:
   - Use clean Markdown (bullet points, bold key terms, tables if applicable) for maximum readability.`;

/**
 * Generate a streaming RAG answer using retrieved context and recent conversation history.
 *
 * @param {string} question - Current question (or rewritten query)
 * @param {Array} contextChunks - Retrieved vector chunks (after hybrid search + re-ranking)
 * @param {Array} recentMessages - Array of { role, content } for multi-turn context
 * @returns {Promise<AsyncIterable>} Gemini stream object
 */
export async function streamChatWithContext(
  question,
  contextChunks,
  recentMessages = [],
  userMemories = []
) {
  const contextText = contextChunks
    .map(
      (chunk, i) =>
        `--- Context Chunk [${i + 1}] ---
Document: "${chunk.filename}"
Chunk Index: #${chunk.chunkIndex}
Content:
${chunk.text}`
    )
    .join("\n\n");

  const conversationHistory =
    recentMessages.length > 0
      ? recentMessages
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n")
      : "No previous conversation.";

  const memorySection =
    userMemories && userMemories.length > 0
      ? `## User Long-Term Memory & Preferences (Honor these across all answers):
${userMemories.map((m) => `- ${m.content}`).join("\n")}`
      : "";

  const prompt = `${SYSTEM_PROMPT}

## Retrieved Document Context:
${contextText || "NO CONTEXT AVAILABLE."}

${memorySection ? memorySection + "\n\n" : ""}## Recent Conversation History:
${conversationHistory}

## User Question:
${question}

## Your Answer:`;

  try {
    const result = await model.generateContentStream(prompt);
    return result.stream;
  } catch {
    throw new Error("Answer generation is unavailable. Please retry your question.");
  }
}
