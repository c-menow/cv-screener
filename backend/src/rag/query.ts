import { embedText } from "./embed.js";
import { similaritySearch } from "./store.js";
import { gemini } from "../ai";
import config from "../config";
import { CandidateChunk } from "../types";

function formatContext(chunks: CandidateChunk[]) {
  const candidates = new Map();

  for (const chunk of chunks) {
    if (!candidates.has(chunk.cv_id)) {
      candidates.set(chunk.cv_id, {
        name: chunk.candidate_name,
        email: chunk.candidate_email,
        cv_id: chunk.cv_id,
        sections: [],
      });
    }
    candidates.get(chunk.cv_id).sections.push(chunk);
  }

  let context = "";
  for (const candidate of candidates.values()) {
    context += `\n---\nCandidate: ${candidate.name} (id: ${candidate.cv_id}, email: ${candidate.email})\n`;
    for (const s of candidate.sections) {
      context += `[${s.section}] ${s.content}\n`;
    }
  }
  return context.trim();
}

function getSources(chunks: CandidateChunk[]) {
  const candidates = new Map<string, CandidateChunk>();

  for (const chunk of chunks) {
    candidates.set(chunk.cv_id, chunk);
  }

  return Array.from(candidates.values()).map((candidate) => ({
    cvId: candidate.cv_id,
    name: candidate.candidate_name,
    file: candidate.source_file,
  }));
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function toGeminiHistory(history: ChatMessage[], maxMessages = 5) {
  return history.slice(-maxMessages).map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }],
  }));
}

export async function query(
  question: string,
  history: ChatMessage[] = [],
): Promise<{
  answer: string;
  sources: Array<{ cvId: string; name: string; file: string }>;
}> {
  const queryEmbedding = await embedText(question);
  const chunks = await similaritySearch(queryEmbedding, config.TOP_K);

  if (chunks.length === 0) {
    return {
      answer:
        "No CVs found in the database. Try running the ingestion step first.",
      sources: [],
    };
  }

  const context = formatContext(chunks);

  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      ...toGeminiHistory(history, 5),
      {
        role: "user",
        parts: [
          {
            text: `Retrieved CV context: ${context}`,
          },
          {
            text: question,
          },
        ],
      },
    ],
    config: {
      systemInstruction: `Return ONLY valid JSON matching this schema:

{
  "matches": [
    {
      "name": string,
      "email": string,
      "reason": string
    }
  ]
}

Rules:
- Include only matching candidates.
- Never include candidates that do not satisfy the query.
- Do not invent information.
- If there are no matches, return:
{
  "matches": []
}`,
    },
  });

  const answer = response.text ?? "";

  // De-duplicated list of candidates the answer drew on for UI citation.
  const sources = getSources(chunks);

  return { answer, sources };
}
