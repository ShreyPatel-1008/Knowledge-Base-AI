import { Document } from "../models/Document.js";
import { validateUrlForSSRF } from "../utils/ssrfGuard.js";
import {
  extractYouTubeVideoId,
  ingestUrlContent,
} from "../services/urlIngestService.js";
import { processTextPipeline } from "../services/pipelineService.js";

/**
 * Ingest web page or YouTube video content
 * POST /api/ingest/url
 */
export async function ingestUrl(req, res, next) {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid URL string.",
      });
    }

    const trimmedUrl = url.trim();

    // 1. Initial URL syntax check
    let parsedUrl;
    try {
      parsedUrl = new URL(trimmedUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({
          success: false,
          message: "Only HTTP and HTTPS URLs are supported.",
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Malformed URL provided. Ensure it begins with http:// or https://",
      });
    }

    // 2. Check if YouTube or Web
    const ytCheck = extractYouTubeVideoId(trimmedUrl);
    const isYouTube = ytCheck.isYouTube && Boolean(ytCheck.videoId);

    // 3. For Web links: Run strict SSRF pre-check before registering document
    if (!isYouTube) {
      try {
        await validateUrlForSSRF(trimmedUrl);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    // 4. Initial placeholder title
    const initialTitle = isYouTube
      ? `YouTube: ${ytCheck.videoId}`
      : `${parsedUrl.hostname}${parsedUrl.pathname.slice(0, 30)}`;

    const docType = isYouTube ? "youtube" : "web";

    // 5. Create Document record in processing state
    const doc = await Document.create({
      userId: req.user._id,
      filename: initialTitle,
      type: docType,
      sourceUrl: trimmedUrl,
      size: 0,
      storagePath: trimmedUrl,
      status: "processing",
      chunkCount: 0,
    });

    // 6. Asynchronously fetch content, extract text, chunk, embed, and store
    (async () => {
      try {
        console.log(`🌐  [Ingest URL] Fetching content for: ${trimmedUrl}...`);
        const extracted = await ingestUrlContent(trimmedUrl);

        // Update document with actual extracted title and text byte size
        const finalTitle = (extracted.title || initialTitle).slice(0, 160);
        await Document.findByIdAndUpdate(doc._id, {
          filename: finalTitle,
          size: Buffer.byteLength(extracted.text, "utf8"),
        });

        // Send text through unified pipeline
        await processTextPipeline({
          docId: doc._id,
          userId: req.user._id,
          text: extracted.text,
          sourceName: finalTitle,
          sourceType: extracted.sourceType,
          sourceUrl: trimmedUrl,
          pages: 1,
        });
      } catch (err) {
        console.error(`❌  [Ingest URL] Processing failed for ${trimmedUrl}:`, err.message);
        await Document.findByIdAndUpdate(doc._id, {
          status: "failed",
          errorMessage: err.message,
        });
      }
    })();

    // 7. Respond immediately with 202 Accepted
    return res.status(202).json({
      success: true,
      message: `${isYouTube ? "YouTube video transcript" : "Webpage"} queued for ingestion.`,
      document: doc,
    });
  } catch (err) {
    next(err);
  }
}
