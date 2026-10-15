import "dotenv/config";

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // MongoDB
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://localhost:27017/knowledgebase",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "knowledgebase-ai-jwt-dev-secret-key-32chars!",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Google Gemini
  geminiApiKey: process.env.GEMINI_API_KEY,

  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",

  // Qdrant
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  qdrantCollection: process.env.QDRANT_COLLECTION || "knowledgebase",
};

// Fail fast on missing critical vars
const required = ["geminiApiKey", "jwtSecret"];
for (const key of required) {
  if (!config[key]) {
    console.error(`❌  Missing required env var for config.${key}`);
    process.exit(1);
  }
}

export default config;
