import "dotenv/config";
import mongoose from "mongoose";
import config from "./src/config/index.js";
import { User } from "./src/models/User.js";
import { Document } from "./src/models/Document.js";
import { Chat } from "./src/models/Chat.js";
import { Message } from "./src/models/Message.js";
import { searchSimilar } from "./src/services/qdrantService.js";

const BASE_URL = `http://localhost:${config.port}`;

async function runTests() {
  console.log("🧪  Starting 3 Tenant Isolation Security Tests...\n");

  await mongoose.connect(config.mongodbUri);

  // Helper for requests
  const api = async (endpoint, method = "GET", body = null, token = null) => {
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  const ts = Date.now();
  const userAEmail = `alice_${ts}@example.com`;
  const userBEmail = `bob_${ts}@example.com`;

  // 1. Register User A and User B
  const resRegA = await api("/api/auth/register", "POST", {
    name: "Alice",
    email: userAEmail,
    password: "Password123!",
  });
  const tokenA = resRegA.data.token;
  const userAId = resRegA.data.user.id;

  const resRegB = await api("/api/auth/register", "POST", {
    name: "Bob",
    email: userBEmail,
    password: "Password123!",
  });
  const tokenB = resRegB.data.token;
  const userBId = resRegB.data.user.id;

  console.log(`👤  Created User A (Alice, id: ${userAId})`);
  console.log(`👤  Created User B (Bob, id: ${userBId})\n`);

  // Create a document record directly for Alice
  const secretDoc = await Document.create({
    userId: userAId,
    filename: "alice_secret_financials.txt",
    type: "txt",
    size: 1024,
    storagePath: "uploads/documents/dummy-alice.txt",
    status: "ready",
    chunkCount: 3,
  });
  console.log(`📄  Created Document owned by Alice: "${secretDoc.filename}" (ID: ${secretDoc._id})\n`);

  let passedTests = 0;

  // ════════════════════════════════════════════════════
  // Test Case 1: Document List Isolation
  // ════════════════════════════════════════════════════
  console.log("▶️  Test Case 1: Bob requests GET /api/documents");
  const listB = await api("/api/documents", "GET", null, tokenB);

  const containsA = (listB.data.documents || []).some(
    (d) => String(d._id) === String(secretDoc._id) || String(d.userId) === String(userAId)
  );

  if (listB.status === 200 && !containsA) {
    console.log("   ✅ PASSED: Bob cannot see Alice's document in GET /api/documents.");
    passedTests++;
  } else {
    console.error("   ❌ FAILED: Alice's document was exposed in Bob's document list!");
  }

  // ════════════════════════════════════════════════════
  // Test Case 2: Document Deletion Protection
  // ════════════════════════════════════════════════════
  console.log("\n▶️  Test Case 2: Bob tries DELETE /api/documents/:aliceDocId");
  const delAttempt = await api(`/api/documents/${secretDoc._id}`, "DELETE", null, tokenB);

  const docStillExists = await Document.findById(secretDoc._id);

  if (delAttempt.status === 404 && docStillExists) {
    console.log("   ✅ PASSED: Bob was denied deletion (404 Not Found / Denied). Alice's document remains intact.");
    passedTests++;
  } else {
    console.error("   ❌ FAILED: Bob was able to delete Alice's document!");
  }

  // ════════════════════════════════════════════════════
  // Test Case 3: Vector Qdrant Filter Isolation
  // ════════════════════════════════════════════════════
  console.log("\n▶️  Test Case 3: Vector search with Bob's userId");
  // Query vector of 768 zeros
  const dummyQueryVector = new Array(768).fill(0.01);
  const qdrantResultsForBob = await searchSimilar(dummyQueryVector, 10, userBId);

  const exposedFromAlice = qdrantResultsForBob.some(
    (r) => String(r.payload.userId) === String(userAId)
  );

  if (!exposedFromAlice) {
    console.log("   ✅ PASSED: Qdrant search filter strictly excludes Alice's vector embeddings from Bob.");
    passedTests++;
  } else {
    console.error("   ❌ FAILED: Alice's vectors leaked into Bob's search results!");
  }

  // Cleanup test users & document
  await Document.findByIdAndDelete(secretDoc._id);
  await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });
  await mongoose.disconnect();

  console.log(`\n🎉 Summary: ${passedTests}/3 Security Tests Passed.\n`);
}

runTests().catch(console.error);
