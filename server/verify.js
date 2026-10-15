import mongoose from "mongoose";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedText } from "./src/services/embeddingService.js";
import config from "./src/config/index.js";

async function verifyAll() {
  console.log("\n🔍 ── Starting KnowledgeBase System Diagnostics ──\n");
  let passed = 0;
  let total = 5;

  // 1. Backend REST API
  try {
    const res = await fetch(`http://localhost:${config.port}/api/health`);
    const data = await res.json();
    if (data.success) {
      console.log(`✅ [1/5] Express Backend API : Operational (http://localhost:${config.port})`);
      passed++;
    } else {
      console.log(`❌ [1/5] Express Backend API : Unhealthy response`);
    }
  } catch (e) {
    console.error(`❌ [1/5] Express Backend API : Connection failed (${e.message})`);
  }

  // 2. MongoDB
  try {
    await mongoose.connect(config.mongodbUri);
    const count = await mongoose.connection.db.collection("documents").countDocuments();
    console.log(`✅ [2/5] MongoDB Database     : Connected (${count} documents indexed)`);
    await mongoose.disconnect();
    passed++;
  } catch (e) {
    console.error(`❌ [2/5] MongoDB Database     : Connection error (${e.message})`);
  }

  // 3. Qdrant Vector Store
  try {
    const client = new QdrantClient({ url: config.qdrantUrl });
    const col = await client.getCollection(config.qdrantCollection);
    console.log(`✅ [3/5] Qdrant Vector Store  : Connected (${col.points_count} vectors, 768-d)`);
    passed++;
  } catch (e) {
    console.error(`❌ [3/5] Qdrant Vector Store  : Connection error (${e.message})`);
  }

  // 4. Gemini Embedding Model
  try {
    const vector = await embedText("KnowledgeBase test vector");
    if (vector && vector.length === 768) {
      console.log(`✅ [4/5] Gemini Embeddings    : Operational (gemini-embedding-001, 768-d)`);
      passed++;
    } else {
      console.log(`⚠️ [4/5] Gemini Embeddings    : Received vector length ${vector?.length}`);
    }
  } catch (e) {
    console.error(`❌ [4/5] Gemini Embeddings    : Error (${e.message})`);
  }

  // 5. Gemini LLM Generation
  try {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const res = await model.generateContent("Respond with the word 'READY'");
    const text = res.response.text().trim();
    console.log(`✅ [5/5] Gemini Generative LLM: Operational (gemini-2.5-flash: "${text}")`);
    passed++;
  } catch (e) {
    console.error(`❌ [5/5] Gemini Generative LLM: Error (${e.message})`);
  }

  console.log(`\n📊 Diagnostic Summary: ${passed}/${total} checks passed.\n`);
  if (passed === total) {
    console.log("🎉 All components are healthy and ready to use!\n");
  } else {
    console.log("⚠️ Some components had issues. Check the log lines above.\n");
  }
}

verifyAll();
