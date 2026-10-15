import mongoose from "mongoose";

const UserMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["preference", "fact", "work_context", "learning_style", "general"],
      default: "preference",
    },
    sourceChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      default: null,
    },
  },
  { timestamps: true }
);

// Index to support fast multi-tenant queries
UserMemorySchema.index({ userId: 1, createdAt: -1 });

export const UserMemory = mongoose.model("UserMemory", UserMemorySchema);
