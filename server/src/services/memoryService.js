import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserMemory } from "../models/UserMemory.js";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey || "placeholder");
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.2,
    responseMimeType: "application/json",
  },
});

/**
 * Normalizes a memory string for fuzzy/exact deduplication
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Computes Jaccard word similarity between two strings
 */
function computeSimilarity(str1, str2) {
  const words1 = new Set(normalizeText(str1).split(" ").filter(Boolean));
  const words2 = new Set(normalizeText(str2).split(" ").filter(Boolean));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Rule-based heuristic extractor if LLM is unavailable or offline
 */
function extractHeuristicMemories(userMessage) {
  const extracted = [];
  const text = userMessage.trim();

  // Pattern: "I prefer ..."
  const preferMatch = text.match(/I\s+prefer\s+([^.!?\n]{4,60})/i);
  if (preferMatch) {
    extracted.push({
      content: `Prefers ${preferMatch[1].trim()}`,
      category: "preference",
    });
  }

  // Pattern: "I am a ... / I'm a ..."
  const roleMatch = text.match(/I(?:'m|\s+am)\s+an?\s+([^.!?\n]{3,40})/i);
  if (roleMatch && !roleMatch[1].toLowerCase().includes("trying") && !roleMatch[1].toLowerCase().includes("looking")) {
    extracted.push({
      content: `Is a ${roleMatch[1].trim()}`,
      category: "work_context",
    });
  }

  // Pattern: "Please explain with code / I want code examples"
  if (/with\s+code\s+examples?/i.test(text) || /prefer\s+code/i.test(text)) {
    extracted.push({
      content: "Prefers explanations with code examples",
      category: "learning_style",
    });
  }

  // Pattern: "in bullet points"
  if (/in\s+bullets?|bullet\s+points?/i.test(text)) {
    extracted.push({
      content: "Prefers concise bullet points",
      category: "learning_style",
    });
  }

  return extracted;
}

/**
 * Extract durable personal facts and preferences from a user interaction,
 * deduplicate against existing memories, and persist new ones.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.userMessage
 * @param {string} params.assistantMessage
 * @param {string} [params.chatId]
 */
export async function extractAndSaveMemories({
  userId,
  userMessage,
  assistantMessage,
  chatId = null,
}) {
  if (!userMessage || userMessage.trim().length < 5) return [];

  let candidates = [];

  const prompt = `You are a Long-Term Memory Extraction Engine for a personal AI assistant.
Analyze the user's message below and extract any durable personal facts, learning preferences, technical roles, or interaction preferences.

Examples of good memories to extract:
- "Prefers explanations with code examples"
- "Works as a software engineer with React and Node.js"
- "Prefers concise bullet points over long explanations"
- "Interested in cybersecurity and compliance"
- "Prefers simple language without heavy jargon"

Strict Rules:
1. ONLY extract enduring user preferences, background facts, or explicit constraints stated by the USER.
2. Do NOT extract ephemeral questions or one-off document queries (e.g. "What does section 2 say?", "Summarize this PDF").
3. Keep each memory short, clear, and atomic (4 to 12 words).
4. If no durable preferences or facts are present, return an empty array [].

User message:
"${userMessage}"

Assistant response:
"${(assistantMessage || "").slice(0, 300)}"

Return ONLY valid JSON matching this schema:
{
  "memories": [
    {
      "content": "Short description of fact or preference",
      "category": "preference" | "fact" | "work_context" | "learning_style" | "general"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed.memories)) {
      candidates = parsed.memories.filter((m) => m && m.content && m.content.length >= 5);
    }
  } catch (err) {
    // If Gemini fails or invalid key, use reliable heuristic fallback
    candidates = extractHeuristicMemories(userMessage);
  }

  if (candidates.length === 0) return [];

  // Deduplication against existing user memories
  const existingMemories = await UserMemory.find({ userId });
  const newMemoriesToInsert = [];

  for (const candidate of candidates) {
    const candidateNorm = normalizeText(candidate.content);
    let isDuplicate = false;

    for (const existing of existingMemories) {
      const existingNorm = normalizeText(existing.content);

      // Check exact match or high word overlap
      if (
        candidateNorm === existingNorm ||
        candidateNorm.includes(existingNorm) ||
        existingNorm.includes(candidateNorm) ||
        computeSimilarity(candidate.content, existing.content) > 0.65
      ) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      newMemoriesToInsert.push({
        userId,
        content: candidate.content.trim(),
        category: candidate.category || "preference",
        sourceChatId: chatId,
      });
      // Add to existing set to avoid self-duplicates in the same batch
      existingMemories.push({ content: candidate.content });
    }
  }

  if (newMemoriesToInsert.length > 0) {
    const inserted = await UserMemory.insertMany(newMemoriesToInsert);
    console.log(
      `🧠  [Memory] Stored ${inserted.length} new memories for user ${userId}:`,
      inserted.map((m) => `"${m.content}"`).join(", ")
    );
    return inserted;
  }

  return [];
}

/**
 * Retrieve user's active memories formatted for prompt injection
 * @param {string} userId
 * @param {number} [limit=15]
 * @returns {Promise<Array>}
 */
export async function getRelevantMemories(userId, limit = 15) {
  if (!userId) return [];
  return await UserMemory.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}
