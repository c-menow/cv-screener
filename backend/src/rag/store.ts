import { pool } from "../db";
import { CandidateChunk } from "../types";

export async function storeEmbeddings(
  cvId: string,
  sourceFile: string,
  candidateName: string | undefined,
  candidateEmail: string | undefined,
  chunkSection: string,
  chunkContent: string,
  vectorLiteral: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO cv_chunks (cv_id, source_file, candidate_name, candidate_email, section, content, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      cvId,
      sourceFile,
      candidateName,
      candidateEmail,
      chunkSection,
      chunkContent,
      vectorLiteral,
    ],
  );
}

export async function retrieveEmbeddings(cvId: string): Promise<number> {
  const existing = await pool.query<{ count: string; candidate_name: string }>(
    `SELECT count(*)::text AS count, min(candidate_name) AS candidate_name
       FROM cv_chunks WHERE cv_id = $1`,
    [cvId],
  );
  const existingCount = Number(existing.rows[0]?.count ?? 0);

  return existingCount;
}

export async function similaritySearch(
  queryEmbedding: number[][],
  topK = 5,
): Promise<CandidateChunk[]> {
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const { rows } = await pool.query(
    `SELECT
       cv_id,
       source_file,
       candidate_name,
       candidate_email,
       section,
       content,
       1 - (embedding <=> $1) AS similarity
     FROM cv_chunks
     ORDER BY embedding <=> $1
     LIMIT $2`,
    [vectorLiteral, topK],
  );

  return rows;
}
