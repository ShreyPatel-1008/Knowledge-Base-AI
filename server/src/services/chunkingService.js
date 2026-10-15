import config from "../config/index.js";

/**
 * Recursive character & structure-aware text splitter.
 * Respects Markdown headings (#, ##, ###), paragraph breaks (\n\n),
 * line breaks (\n), sentence delimiters (. ! ?), and words.
 *
 * Configurable via parameters or environment variables.
 */
export class RecursiveCharacterTextSplitter {
  constructor(options = {}) {
    this.chunkSize =
      options.chunkSize ||
      parseInt(process.env.CHUNK_SIZE, 10) ||
      800;
    this.chunkOverlap =
      options.chunkOverlap ||
      parseInt(process.env.CHUNK_OVERLAP, 10) ||
      120;
    this.separators = options.separators || [
      "\n# ",
      "\n## ",
      "\n### ",
      "\n#### ",
      "\n\n",
      "\n",
      ". ",
      "? ",
      "! ",
      "; ",
      " ",
      "",
    ];
  }

  splitText(text) {
    if (!text || typeof text !== "string") return [];
    const normalized = text.replace(/\r\n/g, "\n").trim();
    return this._split(normalized, this.separators);
  }

  _split(text, separators) {
    const finalChunks = [];
    let separator = separators[separators.length - 1];
    let newSeparators = [];

    // Find the highest-priority separator that exists in text
    for (let i = 0; i < separators.length; i++) {
      const s = separators[i];
      if (s === "" || text.includes(s)) {
        separator = s;
        newSeparators = separators.slice(i + 1);
        break;
      }
    }

    // Split by chosen separator
    const splits = separator ? text.split(separator) : [text];
    let goodSplits = [];

    for (const s of splits) {
      if (s.length < this.chunkSize) {
        goodSplits.push(s);
      } else {
        if (goodSplits.length > 0) {
          const merged = this._mergeSplits(goodSplits, separator);
          finalChunks.push(...merged);
          goodSplits = [];
        }
        if (newSeparators.length === 0) {
          finalChunks.push(s);
        } else {
          const subChunks = this._split(s, newSeparators);
          finalChunks.push(...subChunks);
        }
      }
    }

    if (goodSplits.length > 0) {
      const merged = this._mergeSplits(goodSplits, separator);
      finalChunks.push(...merged);
    }

    return finalChunks;
  }

  _mergeSplits(splits, separator) {
    const docs = [];
    let currentDoc = [];
    let total = 0;

    for (const d of splits) {
      const _len = d.length;
      if (
        total + _len + (currentDoc.length > 0 ? separator.length : 0) >
        this.chunkSize
      ) {
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator).trim();
          if (doc) docs.push(doc);

          // Build overlap by taking trailing elements
          while (
            total > this.chunkOverlap ||
            (total + _len + (currentDoc.length > 0 ? separator.length : 0) >
              this.chunkSize &&
              total > 0)
          ) {
            total -= currentDoc[0].length + (currentDoc.length > 1 ? separator.length : 0);
            currentDoc.shift();
          }
        }
      }
      currentDoc.push(d);
      total += _len + (currentDoc.length > 1 ? separator.length : 0);
    }

    if (currentDoc.length > 0) {
      const doc = currentDoc.join(separator).trim();
      if (doc) docs.push(doc);
    }

    return docs;
  }
}

/**
 * Helper function to chunk text with optional overrides
 */
export function chunkText(text, options = {}) {
  const splitter = new RecursiveCharacterTextSplitter(options);
  return splitter.splitText(text);
}
