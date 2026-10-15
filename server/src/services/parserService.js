import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

/**
 * Detect file extension / type
 */
export function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  if (["pdf", "docx", "txt", "md"].includes(ext)) {
    return ext;
  }
  return null;
}

/**
 * Parse document content from file on disk.
 * Supports PDF, DOCX, TXT, and MD.
 *
 * @param {string} filePath - Absolute or relative path to file
 * @param {string} fileType - One of "pdf", "docx", "txt", "md"
 * @returns {Promise<{ text: string, pages: number }>}
 */
export async function parseDocument(filePath, fileType) {
  switch (fileType) {
    case "pdf": {
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return {
        text: data.text || "",
        pages: data.numpages || 1,
      };
    }

    case "docx": {
      const result = await mammoth.extractRawText({ path: filePath });
      return {
        text: result.value || "",
        pages: 1,
      };
    }

    case "txt":
    case "md": {
      const text = await fs.readFile(filePath, "utf-8");
      return {
        text: text || "",
        pages: 1,
      };
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
