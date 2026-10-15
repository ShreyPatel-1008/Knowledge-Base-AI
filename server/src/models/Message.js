import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sources: [
      {
        filename: String,
        chunkPreview: String,
        chunkIndex: Number,
        page: Number,
        score: Number,
        documentId: String,
      },
    ],
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", MessageSchema);
