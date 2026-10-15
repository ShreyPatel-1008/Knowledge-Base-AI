/**
 * Compute the L2-normalized mean vector of multiple embeddings
 *
 * @param {Array<Array<number>>} embeddings - Array of embedding vectors
 * @returns {Array<number>} Normalized average embedding vector
 */
export function computeAverageEmbedding(embeddings) {
  if (!embeddings || embeddings.length === 0) return [];
  const dim = embeddings[0].length;
  const avg = new Array(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      avg[i] += emb[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    avg[i] /= embeddings.length;
  }

  const norm = Math.sqrt(avg.reduce((sum, v) => sum + v * v, 0)) || 1;
  return avg.map((v) => v / norm);
}

/**
 * Compute cosine similarity between two L2-normalized vectors
 *
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number} Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }

  return dot;
}
