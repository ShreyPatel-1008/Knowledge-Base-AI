import { ApiError } from "../utils/ApiError.js";
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
  } catch {
    throw new ApiError(503, "Could not generate a valid study set. Please try again.");
  }
}
