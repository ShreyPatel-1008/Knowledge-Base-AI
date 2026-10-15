import mongoose from "mongoose";
import config from "./index.js";

/**
 * Connect to MongoDB with sensible defaults.
 * Mongoose 8 uses the new URL parser and unified topology by default.
 */
export async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("✅  MongoDB connected:", mongoose.connection.name);
  } catch (err) {
    console.error("❌  MongoDB connection error:", err.message);
    process.exit(1);
  }
}
