import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  extractTextFromPdf,
  extractCvStructure,
  embedText,
  buildChunks,
  retrieveEmbeddings,
  storeEmbeddings,
} = vi.hoisted(() => ({
  extractTextFromPdf: vi.fn(),
  extractCvStructure: vi.fn(),
  embedText: vi.fn(),
  buildChunks: vi.fn(),
  retrieveEmbeddings: vi.fn(),
  storeEmbeddings: vi.fn(),
}));

vi.mock("../../src/db", () => ({ closePool: vi.fn() }));
vi.mock("../../src/rag/extract", () => ({
  extractTextFromPdf,
  extractCvStructure,
}));
vi.mock("../../src/rag/embed", () => ({ embedText }));
vi.mock("../../src/rag/chunk", () => ({ buildChunks }));
vi.mock("../../src/rag/store", () => ({ retrieveEmbeddings, storeEmbeddings }));

import { ingestFile } from "../../src/rag/ingest";

beforeEach(() => {
  extractTextFromPdf.mockReset();
  extractCvStructure.mockReset();
  embedText.mockReset();
  buildChunks.mockReset();
  retrieveEmbeddings.mockReset();
  storeEmbeddings.mockReset();
});

describe("ingestFile", () => {
  it("skips extraction and storage when the CV is already ingested", async () => {
    retrieveEmbeddings.mockResolvedValue(3);

    const result = await ingestFile("/cvs/cv-1.pdf");

    expect(result).toEqual({ cvId: "cv-1", skipped: true });
    expect(extractTextFromPdf).not.toHaveBeenCalled();
    expect(storeEmbeddings).not.toHaveBeenCalled();
  });

  it("throws when the parser returns no usable sections", async () => {
    retrieveEmbeddings.mockResolvedValue(0);
    extractTextFromPdf.mockResolvedValue("raw text");
    extractCvStructure.mockResolvedValue({ name: "Ada", email: "ada@x.com" });
    buildChunks.mockReturnValue([]);

    await expect(ingestFile("/cvs/cv-1.pdf")).rejects.toThrow(
      "CV parser returned no usable sections",
    );
    expect(storeEmbeddings).not.toHaveBeenCalled();
  });

  it("embeds and stores every chunk", async () => {
    retrieveEmbeddings.mockResolvedValue(0);
    extractTextFromPdf.mockResolvedValue("raw text");
    extractCvStructure.mockResolvedValue({
      name: "  Ada Lovelace  ",
      email: "  ada@example.com  ",
    });
    buildChunks.mockReturnValue([
      { section: "summary", content: "Summary" },
      { section: "skills", content: "Rust" },
    ]);
    embedText
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([0.3, 0.4]);

    const result = await ingestFile("/cvs/cv-1.pdf");

    expect(embedText).toHaveBeenNthCalledWith(1, "Summary");
    expect(embedText).toHaveBeenNthCalledWith(2, "Rust");

    expect(storeEmbeddings).toHaveBeenNthCalledWith(
      1,
      "cv-1",
      "/cvs/cv-1.pdf",
      "Ada Lovelace",
      "ada@example.com",
      "summary",
      "Summary",
      "[0.1,0.2]",
    );
    expect(storeEmbeddings).toHaveBeenNthCalledWith(
      2,
      "cv-1",
      "/cvs/cv-1.pdf",
      "Ada Lovelace",
      "ada@example.com",
      "skills",
      "Rust",
      "[0.3,0.4]",
    );

    expect(result).toEqual({
      cvId: "cv-1",
      candidateName: "Ada Lovelace",
      chunkCount: 2,
      skipped: false,
    });
  });
});
