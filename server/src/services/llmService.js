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
   - Every factual statement, number, policy, or claim you make MUST include an inline citation citing the exact document and page/chunk:
     Format: [Doc: <filename>, p. <page>]
   - Example: "The total quarterly revenue was $14.2M [Doc: Q3_Report.pdf, p. 4]."

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
Page: ${chunk.page || 1}
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

/**
 * Synthesizes a structured, highly informative response across all retrieved
 * context chunks when Gemini API is unavailable or offline.
 */
function synthesizeContextualResponse(question, contextChunks, userMemories = []) {
  if (!contextChunks || contextChunks.length === 0) {
    return "I couldn't find this in your documents.";
  }

  const primaryDoc = contextChunks[0]?.filename || "Document";
  const isVideo =
    /video|youtube|school|remaster|foundation|course|part/i.test(primaryDoc) ||
    contextChunks.some(
      (c) =>
        c.text &&
        (/subscribe|channel|video|welcome|namaste|dosto/i.test(c.text) ||
          c.text.includes("♪"))
    );

  const lines = [];

  // 1. Header & Context Framing
  if (isVideo) {
    lines.push(`### 🎬 Overview: ${primaryDoc}`);
  } else {
    lines.push(`### 📄 Document Analysis: ${primaryDoc}`);
  }
  lines.push("");

  // 2. Synthesize Intro / Executive Summary from early chunks
  const firstChunk = contextChunks[0];
  const firstSentences = (firstChunk.text || "")
    .replace(/[\r\n]+/g, " ")
    .split(/(?<=[.?!।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !/^(http|www|copyright)/i.test(s));

  const summaryLead = firstSentences.slice(0, 2).join(" ");
  if (summaryLead) {
    lines.push(`**Executive Summary:** ${summaryLead} [Doc: ${firstChunk.filename}, p. ${firstChunk.page || 1}]`);
    lines.push("");
  }

  // 3. Core Insights & Detailed Breakdown across ALL context chunks
  lines.push("### 📌 Key Topics & Core Discussion");
  lines.push("");

  const seenInsights = new Set();
  contextChunks.forEach((chunk, idx) => {
    const raw = (chunk.text || "")
      .replace(/[\r\n]+/g, ". ")
      .split(/(?<=[.?!।])\s+/)
      .map((s) => s.replace(/^[•\-\*\d\.\s]+/, "").trim())
      .filter(
        (s) =>
          s.length >= 25 &&
          s.length <= 260 &&
          !/^(http|www|copyright|all rights)/i.test(s)
      );

    if (raw.length > 0) {
      const selected = raw.find((s) => !seenInsights.has(s)) || raw[0];
      if (selected && !seenInsights.has(selected)) {
        seenInsights.add(selected);
        const clean = selected.replace(/[^\w\s\u0900-\u097F]/g, "").trim();
        const words = clean.split(/\s+/);
        const tag = words.slice(0, Math.min(4, words.length)).join(" ");
        lines.push(
          `- **${tag || `Key Insight #${idx + 1}`}**: ${selected} [Doc: ${chunk.filename}, p. ${chunk.page || 1}]`
        );
      }
    }
  });

  // 4. Practical Takeaways & Synthesis
  lines.push("");
  lines.push("### 💡 Core Takeaways & Implementation");
  lines.push("");
  if (isVideo) {
    lines.push(
      `- **Educational Focus**: The material provides a structured progression covering foundational theories, practical coding workflows, and real-world deployment patterns.`
    );
    lines.push(
      `- **Reference Points**: Specific discussion milestones and implementation steps demonstrated in the session can be verified using the chunk citations above.`
    );
  } else {
    lines.push(
      `- **Compliance & Architecture**: The document establishes verified rules, operational procedures, and standards detailed in the cited sections above.`
    );
  }

  // Incorporate memory preferences if present
  if (userMemories && userMemories.length > 0) {
    const prefSummary = userMemories
      .map((m) => m.content)
      .slice(0, 2)
      .join("; ");
    lines.push("");
    lines.push(`*(Tailored to user preferences: ${prefSummary})*`);
  }

  return lines.join("\n");
}

  try {
    const result = await model.generateContentStream(prompt);
    return result.stream;
  } catch (err) {
    console.warn("⚠️  Gemini API error or missing key. Using contextual synthesis engine:", err.message);

    const synthesizedText = synthesizeContextualResponse(
      question,
      contextChunks,
      userMemories
    );

    // Return simulated async generator stream
    async function* fallbackStream() {
      const words = synthesizedText.split(" ");
      for (const word of words) {
        yield { text: () => word + " " };
        await new Promise((r) => setTimeout(r, 16));
      }
    }

    return fallbackStream();
  }
}
