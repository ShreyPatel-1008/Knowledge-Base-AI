import mongoose from "mongoose";

const ChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    page: {
      type: Number,
      default: 1,
    },
    text: {
      type: String,
      required: true,
    },
    sourceType: {
      type: String,
      default: "file",
    },
    sourceUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Full-text search index on text field
ChunkSchema.index({ text: "text" });

// Fast multi-tenant compound lookup
ChunkSchema.index({ userId: 1, documentId: 1, chunkIndex: 1 });

export const Chunk = mongoose.model("Chunk", ChunkSchema);
