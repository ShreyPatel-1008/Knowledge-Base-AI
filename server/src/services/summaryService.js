import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.geminiApiKey || "placeholder");
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: { temperature: 0.2 },
});

/**
 * Fallback extractor for summary & tags if LLM is unavailable
 */
function heuristicSummaryAndTags(text, filename) {
  const clean = text.replace(/#+/g, "").replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.?!])\s+/).filter((s) => s.length > 20);

  const summary =
    sentences.slice(0, 3).join(" ") ||
    `Document ${filename} contains structured notes and information for knowledge base reference.`;

  // Extract frequent capitalized or distinct words as tags
  const words = clean
    .split(/\W+/)
    .filter((w) => w.length > 4 && !/^(about|their|there|which|would|these|where|should)$/i.test(w));

  const freq = {};
  for (const w of words) {
    const norm = w[0].toUpperCase() + w.slice(1).toLowerCase();
    freq[norm] = (freq[norm] || 0) + 1;
  }

  const sortedTags = Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 5);

  const fallbackTags = sortedTags.length >= 3 ? sortedTags : ["Documentation", "Notes", "Knowledge", "Policy", "Reference"];

  return {
    summary,
    tags: fallbackTags.slice(0, 5),
  };
}

/**
 * Generate a 3-sentence summary and 5 topic tags for an ingested document.
 *
 * @param {string} text - Full document text
 * @param {string} filename - Original filename
 * @returns {Promise<{ summary: string, tags: string[] }>}
 */
export async function generateSummaryAndTags(text, filename) {
  if (!text || text.trim().length === 0) {
    return {
      summary: `Document ${filename} has no readable text.`,
      tags: ["Empty"],
    };
  }

  // Sample up to first 8,000 characters for swift summary generation
  const sampleText = text.slice(0, 8000);

  const prompt = `You are an expert document taxonomist and executive summarizer.
Analyze the document text below for "${filename}".

Generate:
1. Exactly a 3-sentence executive summary explaining: (1) what the document is, (2) the core policies, facts, or architecture it defines, and (3) key takeaways or conclusions.
2. Exactly 5 concise, high-value topic tags (1-3 words each, capitalized, e.g. "HR Policy", "Authentication", "PTO", "Security", "Benefits").

## Document Snippet:
${sampleText}

## Return Format:
Return ONLY a valid JSON object with the following structure, with NO surrounding explanation or markdown:
{
  "summary": "Sentence one. Sentence two. Sentence three.",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 5)
      : [];

    if (summary && tags.length > 0) {
      return { summary, tags };
    }
    return heuristicSummaryAndTags(text, filename);
  } catch (err) {
    console.warn("⚠️  LLM summary generation failed, using heuristic summary:", err.message);
    return heuristicSummaryAndTags(text, filename);
  }
}
