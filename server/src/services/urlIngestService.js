import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { YoutubeTranscript } from "youtube-transcript";
import { validateUrlForSSRF } from "../utils/ssrfGuard.js";

/**
 * Checks if a URL points to a YouTube video and extracts the 11-char video ID.
 * @param {string} rawUrl
 * @returns {{ isYouTube: boolean, videoId?: string }}
 */
export function extractYouTubeVideoId(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split(/[?#&]/)[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return { isYouTube: true, videoId: id };
      }
    }

    if (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com"
    ) {
      // standard watch?v=...
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return { isYouTube: true, videoId: v };
      }

      // shorts/... or embed/...
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "v") {
        const id = parts[1]?.split(/[?#&]/)[0];
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
          return { isYouTube: true, videoId: id };
        }
      }
    }

    return { isYouTube: false };
  } catch (err) {
    return { isYouTube: false };
  }
}

/**
 * Clean HTML entities commonly present in YouTube transcript items
 */
function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

/**
 * Fetches title and transcripts from a YouTube video
 * @param {string} videoId
 * @param {string} rawUrl
 */
export async function fetchYouTubeTranscript(videoId, rawUrl) {
  // 1. Fetch video metadata / title via public oEmbed endpoint
  let title = `YouTube Video (${videoId})`;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title) {
        title = data.title;
      }
    }
  } catch (e) {
    // Non-fatal, use fallback title
  }

  // 2. Fetch transcript using YoutubeTranscript
  let items;
  try {
    items = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    throw new Error(
      `YouTube transcript unavailable for video (${videoId}): ${err.message || "Captions are disabled or not accessible."}`
    );
  }

  if (!items || items.length === 0) {
    throw new Error(`No transcript lines returned for YouTube video (${videoId}).`);
  }

  // Group transcript items into flowing paragraphs
  const paragraphs = [];
  let currentPara = [];
  let currentLen = 0;

  for (const item of items) {
    const cleanLine = decodeEntities(item.text).trim();
    if (!cleanLine) continue;

    currentPara.push(cleanLine);
    currentLen += cleanLine.length;

    if (currentLen > 350 || currentPara.length >= 6) {
      paragraphs.push(currentPara.join(" "));
      currentPara = [];
      currentLen = 0;
    }
  }
  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(" "));
  }

  const fullText = paragraphs.join("\n\n");
  if (!fullText || fullText.trim().length < 20) {
    throw new Error("Transcript content is too short or empty.");
  }

  return {
    title,
    text: fullText,
    sourceType: "youtube",
    sourceUrl: rawUrl,
  };
}

/**
 * Fetches and extracts main article content from a web page using @mozilla/readability and jsdom.
 * Validates SSRF safety beforehand and after redirects.
 * @param {string} rawUrl
 */
export async function fetchWebpageContent(rawUrl) {
  // 1. Validate initial URL against SSRF
  await validateUrlForSSRF(rawUrl);

  // 2. Fetch page HTML
  const res = await fetch(rawUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000), // 15 seconds timeout
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch webpage: HTTP ${res.status} ${res.statusText}`);
  }

  // 3. Verify final redirect destination against SSRF
  if (res.url && res.url !== rawUrl) {
    await validateUrlForSSRF(res.url);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error(`Invalid content-type "${contentType}". Only HTML webpages are supported.`);
  }

  const html = await res.text();
  if (!html || html.trim().length < 50) {
    throw new Error("Downloaded webpage HTML is empty or too short.");
  }

  // 4. Extract with JSDOM + Readability
  const dom = new JSDOM(html, { url: res.url || rawUrl });
  const doc = dom.window.document;

  const reader = new Readability(doc);
  const article = reader.parse();

  let title = (article?.title || doc.title || rawUrl).trim();
  let text = (article?.textContent || doc.body?.textContent || "").trim();

  // Normalize excessive whitespaces and empty lines
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!text || text.length < 50) {
    throw new Error("Could not extract readable article text from the webpage.");
  }

  return {
    title,
    text,
    sourceType: "web",
    sourceUrl: rawUrl,
  };
}

/**
 * Unified ingest URL dispatcher
 * @param {string} rawUrl
 */
export async function ingestUrlContent(rawUrl) {
  const yt = extractYouTubeVideoId(rawUrl);
  if (yt.isYouTube && yt.videoId) {
    return await fetchYouTubeTranscript(yt.videoId, rawUrl);
  } else {
    return await fetchWebpageContent(rawUrl);
  }
}
