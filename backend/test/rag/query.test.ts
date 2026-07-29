import { beforeEach, describe, expect, it, vi } from "vitest";
import config from "../../src/config";
import type { CandidateChunk } from "../../src/types";

const { embedText, similaritySearch, generateContent } = vi.hoisted(() => ({
  embedText: vi.fn(),
  similaritySearch: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock("../../src/rag/embed", () => ({ embedText }));
vi.mock("../../src/rag/store", () => ({ similaritySearch }));
vi.mock("../../src/ai", () => ({
  gemini: { models: { generateContent } },
}));

import { query } from "../../src/rag/query";

const chunk = (overrides: Partial<CandidateChunk> = {}): CandidateChunk => ({
  cv_id: "cv-1",
  source_file: "/cvs/cv-1.pdf",
  candidate_name: "Ada Lovelace",
  candidate_email: "ada@example.com",
  section: "summary",
  content: "Loves analytical engines.",
  similarity: 0.9,
  ...overrides,
});

beforeEach(() => {
  embedText.mockReset();
  similaritySearch.mockReset();
  generateContent.mockReset();
  embedText.mockResolvedValue([[0.1, 0.2]]);
});

describe("query", () => {
  it("short-circuits with a helpful message when no chunks are retrieved", async () => {
    similaritySearch.mockResolvedValue([]);

    const result = await query("Who knows Rust?");

    expect(result).toEqual({
      answer:
        "No CVs found in the database. Try running the ingestion step first.",
      sources: [],
    });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("embeds the question and searches with config.TOP_K", async () => {
    similaritySearch.mockResolvedValue([chunk()]);
    generateContent.mockResolvedValue({ text: '{"matches":[]}' });

    await query("Who knows Rust?");

    expect(embedText).toHaveBeenCalledWith("Who knows Rust?");
    expect(similaritySearch).toHaveBeenCalledWith([[0.1, 0.2]], config.TOP_K);
  });

  it("includes each candidate's name, id and email in the context sent to Gemini", async () => {
    similaritySearch.mockResolvedValue([
      chunk({
        candidate_name: "Ada Lovelace",
        cv_id: "cv-1",
        candidate_email: "ada@example.com",
      }),
    ]);
    generateContent.mockResolvedValue({ text: '{"matches":[]}' });

    await query("Who knows Rust?");

    const call = generateContent.mock.calls[0]?.[0];
    const contextPart = call.contents.at(-1).parts[0].text;

    expect(contextPart).toContain("Ada Lovelace");
    expect(contextPart).toContain("cv-1");
    expect(contextPart).toContain("ada@example.com");
  });

  it("groups multiple chunks for the same candidate under one context block", async () => {
    similaritySearch.mockResolvedValue([
      chunk({ section: "summary", content: "Summary text" }),
      chunk({ section: "skills", content: "Rust, TypeScript" }),
    ]);
    generateContent.mockResolvedValue({ text: '{"matches":[]}' });

    await query("Who knows Rust?");

    const call = generateContent.mock.calls[0]?.[0];
    const contextPart = call.contents.at(-1).parts[0].text;

    expect(contextPart.match(/Candidate: Ada Lovelace/g)).toHaveLength(1);
    expect(contextPart).toContain("[summary] Summary text");
    expect(contextPart).toContain("[skills] Rust, TypeScript");
  });

  it("sends the question as a separate part alongside the context", async () => {
    similaritySearch.mockResolvedValue([chunk()]);
    generateContent.mockResolvedValue({ text: '{"matches":[]}' });

    await query("Who knows Rust?");

    const call = generateContent.mock.calls[0]?.[0];
    const lastTurn = call.contents.at(-1);

    expect(lastTurn.role).toBe("user");
    expect(lastTurn.parts[1]).toEqual({ text: "Who knows Rust?" });
  });

  it("converts chat history into Gemini's role/parts shape, capped to the last 5 turns", async () => {
    similaritySearch.mockResolvedValue([chunk()]);
    generateContent.mockResolvedValue({ text: '{"matches":[]}' });

    const history = Array.from({ length: 7 }, (_, i) => ({
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `turn ${i}`,
    }));

    await query("Who knows Rust?", history);

    const call = generateContent.mock.calls[0]?.[0];
    const historyTurns = call.contents.slice(0, -1);

    expect(historyTurns).toEqual([
      { role: "user", parts: [{ text: "turn 2" }] },
      { role: "model", parts: [{ text: "turn 3" }] },
      { role: "user", parts: [{ text: "turn 4" }] },
      { role: "model", parts: [{ text: "turn 5" }] },
      { role: "user", parts: [{ text: "turn 6" }] },
    ]);
  });

  it("returns Gemini's raw text as the answer", async () => {
    similaritySearch.mockResolvedValue([chunk()]);
    generateContent.mockResolvedValue({
      text: '{"matches":[{"name":"Ada Lovelace","email":"ada@example.com","reason":"Rust experience"}]}',
    });

    const result = await query("Who knows Rust?");

    expect(result.answer).toBe(
      '{"matches":[{"name":"Ada Lovelace","email":"ada@example.com","reason":"Rust experience"}]}',
    );
  });

  it("falls back to an empty string answer when Gemini returns no text", async () => {
    similaritySearch.mockResolvedValue([chunk()]);
    generateContent.mockResolvedValue({ text: undefined });

    const result = await query("Who knows Rust?");

    expect(result.answer).toBe("");
  });

  it("returns one deduplicated source per candidate", async () => {
    similaritySearch.mockResolvedValue([
      chunk({ cv_id: "cv-1", section: "summary" }),
      chunk({ cv_id: "cv-1", section: "skills" }),
      chunk({
        cv_id: "cv-2",
        candidate_name: "Grace Hopper",
        source_file: "/cvs/cv-2.pdf",
      }),
    ]);
    generateContent.mockResolvedValue({ text: '{"matches":[]}' });

    const result = await query("Who knows Rust?");

    expect(result.sources).toEqual([
      { cvId: "cv-1", name: "Ada Lovelace", file: "/cvs/cv-1.pdf" },
      { cvId: "cv-2", name: "Grace Hopper", file: "/cvs/cv-2.pdf" },
    ]);
  });
});
