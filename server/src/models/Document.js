import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["pdf", "docx", "txt", "md", "web", "youtube"],
    },
    sourceUrl: {
      type: String,
      default: null,
    },
    size: {
      type: Number,
      default: 0,
    },
    storagePath: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },
    errorMessage: {
      type: String,
      default: null,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: null,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    embedding: {
      type: [Number],
      default: [],
      select: false, // Don't load vector payload in basic list queries
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index tags for fast tag filtering
DocumentSchema.index({ userId: 1, tags: 1 });

export const Document = mongoose.model("Document", DocumentSchema);
