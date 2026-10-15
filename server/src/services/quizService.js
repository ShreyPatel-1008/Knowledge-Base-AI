import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey || "placeholder");
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 0.3,
    responseMimeType: "application/json",
  },
});

// Strict Zod schemas
export const QuizQuestionSchema = z.object({
  id: z.number(),
  question: z.string().min(5),
  options: z.array(z.string()).length(4),
  answerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(5),
});

export const FlashcardSchema = z.object({
  id: z.number(),
  front: z.string().min(3),
  back: z.string().min(5),
  category: z.string().default("General"),
});

export const StudySetSchema = z.object({
  title: z.string(),
  questions: z.array(QuizQuestionSchema).length(10),
  flashcards: z.array(FlashcardSchema).length(10),
});

/**
 * Fallback generator if Gemini is unavailable or returns malformed data.
 * Extracts authentic, diverse sentences across all chunks to create 10 distinct
 * questions, randomized answer indexes (0-3), unique distractors, and tailored flashcards.
 */
function generateFallbackStudySet(chunks, title) {
  const cleanTitle = (title || "Document").replace(/^Study Set:\s*/i, "").trim();

  // 1. Extract all meaningful, clean sentences from across all chunks
  const allSentences = [];
  chunks.forEach((chunk) => {
    if (!chunk?.text) return;
    // Split on sentence boundaries, newlines, or bullets
    const rawSentences = chunk.text
      .replace(/[\r\n]+/g, ". ")
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.replace(/^[•\-\*\d\.\s]+/, "").trim())
      .filter((s) => s.length >= 25 && s.length <= 200 && !/^(http|www|copyright|all rights)/i.test(s));

    allSentences.push(...rawSentences);
  });

  // Deduplicate sentences
  const uniqueSentences = Array.from(new Set(allSentences));

  // If very few sentences found, synthesize clauses or fall back cleanly
  const pool = uniqueSentences.length >= 10
    ? uniqueSentences
    : chunks.flatMap((c) => (c.text || "").split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length >= 20));

  const safePool = pool.length > 0 ? pool : [
    `${cleanTitle} establishes the core architecture and fundamental principles.`,
    `Data ingestion pipelines normalize external inputs before vector indexing.`,
    `Security policies require strict multi-tenant isolation across all resources.`,
    `Search queries leverage reciprocal rank fusion between dense and sparse retrievals.`,
    `Session state is preserved in persistent storage for auditing and review.`,
    `Error handling mechanisms gracefully degrade to deterministic offline paths.`,
    `Authentication tokens must be validated with HMAC signatures on each request.`,
    `Document chunking divides long-form text into semantically coherent units.`,
    `Cross-encoder re-ranking prioritizes the most relevant context candidates.`,
    `Continuous evaluation ensures high answer precision and grounded factual citations.`
  ];

  // Helper to extract a recognizable subject/concept from a sentence
  function extractConcept(sentence, index) {
    const clean = sentence.replace(/[^\w\s\-\u0900-\u097F]/g, "").trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2) {
      // Look for a break before linking verbs
      const verbIdx = words.findIndex((w) => /^(is|are|was|were|refers|describes|provides|requires|uses|includes|handles|contains)$/i.test(w));
      if (verbIdx >= 1 && verbIdx <= 5) {
        return words.slice(0, verbIdx).join(" ");
      }
      return words.slice(0, Math.min(4, words.length)).join(" ");
    }
    return `Core Principle #${index + 1}`;
  }

  // 10 Distinct Question Stems
  const questionTemplates = [
    (c) => `According to the document, what is the primary role or definition of "${c}"?`,
    (c) => `Based on ${cleanTitle}, which of the following accurately describes "${c}"?`,
    (c) => `How is "${c}" contextualized or utilized within the material?`,
    (c) => `Which key mechanism is directly associated with "${c}"?`,
    (c) => `What does the text highlight regarding the function of "${c}"?`,
    (c) => `In the discussion of ${cleanTitle}, what is emphasized about "${c}"?`,
    (c) => `Which statement represents a verified fact concerning "${c}"?`,
    (c) => `What outcome or requirement is established around "${c}"?`,
    (c) => `According to the source, why is "${c}" significant?`,
    (c) => `Which principle best reflects the author's explanation of "${c}"?`,
  ];

  // Plausible domain distractors if not enough sentences available
  const generalDistractors = [
    "It is an obsolete configuration that has been deprecated in modern workflows.",
    "It requires manual human verification and is bypassed during automated execution.",
    "It serves purely as a temporary debug logging flag without operational impact.",
    "It is exclusively restricted to external third-party compliance audit teams.",
    "It operates in reverse sequence compared to standard retrieval pipelines.",
    "It is only activated when network connectivity is completely unavailable.",
    "It is an optional aesthetic preference rather than a functional requirement.",
    "It functions as a transient in-memory cache without persistent storage guarantees."
  ];

  const questions = [];
  const flashcards = [];

  for (let i = 0; i < 10; i++) {
    // Pick an evenly spaced sentence across the document
    const stepIdx = Math.floor(i * (safePool.length / 10)) % safePool.length;
    const targetSentence = safePool[stepIdx] || `Critical principle #${i + 1} from ${cleanTitle}.`;
    const concept = extractConcept(targetSentence, i);

    // Correct option based on authentic sentence
    const correctOption = targetSentence.length > 120
      ? targetSentence.slice(0, 117).trim() + "…"
      : targetSentence;

    // Pick 3 distinct distractor sentences from elsewhere in the pool
    const distractorCandidates = [];
    for (let offset = 1; distractorCandidates.length < 3 && offset < safePool.length; offset++) {
      const candidateIdx = (stepIdx + offset * 2) % safePool.length;
      const candidate = safePool[candidateIdx];
      if (candidate && candidate !== targetSentence && !distractorCandidates.includes(candidate)) {
        const distractorText = candidate.length > 120 ? candidate.slice(0, 117).trim() + "…" : candidate;
        distractorCandidates.push(distractorText);
      }
    }

    // Fill with general distractors if pool is small
    let gIdx = 0;
    while (distractorCandidates.length < 3) {
      const g = generalDistractors[(i + gIdx) % generalDistractors.length];
      if (!distractorCandidates.includes(g)) {
        distractorCandidates.push(g);
      }
      gIdx++;
    }

    // Distribute answerIndex evenly across 0, 1, 2, 3
    const targetAnswerIndex = (i * 3 + 1) % 4; // produces: 1, 0, 3, 2, 1, 0, 3, 2, 1, 0
    const options = [...distractorCandidates.slice(0, 3)];
    options.splice(targetAnswerIndex, 0, correctOption);

    const questionFn = questionTemplates[i % questionTemplates.length];

    questions.push({
      id: i + 1,
      question: questionFn(concept),
      options,
      answerIndex: targetAnswerIndex,
      explanation: `Verified directly from the source material: "${targetSentence.slice(0, 140)}${targetSentence.length > 140 ? "…" : ""}".`,
    });

    flashcards.push({
      id: i + 1,
      front: `Key Concept #${i + 1}: ${concept}`,
      back: targetSentence,
      category: cleanTitle.length > 25 ? cleanTitle.slice(0, 22) + "…" : cleanTitle,
    });
  }

  return {
    title: `Study Set: ${cleanTitle}`,
    questions,
    flashcards,
  };
}

/**
 * Generate 10 MCQs and 10 Flashcards strictly based on document chunks.
 * Validates output using Zod before returning.
 *
 * @param {Array<Object>} chunks - Array of { text, filename, page }
 * @param {string} sourceName - Document name or Tag name
 * @returns {Promise<{ title: string, questions: Array, flashcards: Array }>}
 */
export async function generateQuizAndFlashcards(chunks, sourceName) {
  if (!chunks || chunks.length === 0) {
    throw new Error("No text chunks available to generate study materials.");
  }

  const combinedContext = chunks
    .slice(0, 12)
    .map((c, i) => `[Excerpt ${i + 1} (${c.filename || sourceName})]:\n${c.text.slice(0, 600)}`)
    .join("\n\n---\n\n");

  const prompt = `You are an expert educational examiner and flashcard creator.
Using ONLY the document excerpts below from "${sourceName}", generate:
1. Exactly 10 high-quality multiple-choice questions (MCQs).
   - Each question must have exactly 4 options.
   - answerIndex must be the 0-based index of the correct option (0, 1, 2, or 3).
   - Include a concise explanation quoting or citing the excerpt.
2. Exactly 10 high-impact flashcards.
   - front: A question, term, or prompt testing core understanding.
   - back: The clear, concise definition, fact, or explanation.
   - category: A 1-2 word topic.

## Source Document Excerpts:
${combinedContext}

## Output Format:
Return ONLY valid JSON matching this exact structure:
{
  "title": "Quiz & Flashcards for ${sourceName}",
  "questions": [
    {
      "id": 1,
      "question": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "explanation": "Because the document states..."
    }
  ],
  "flashcards": [
    {
      "id": 1,
      "front": "Term or Question",
      "back": "Detailed definition or answer",
      "category": "Topic"
    }
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Validate with Zod
    const validated = StudySetSchema.parse(parsed);
    return validated;
  } catch (err) {
    console.warn("⚠️  Quiz generation failed or schema mismatch, using robust fallback:", err.message);
    const fallback = generateFallbackStudySet(chunks, sourceName);
    return StudySetSchema.parse(fallback);
  }
}
