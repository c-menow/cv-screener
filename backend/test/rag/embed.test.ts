import { beforeEach, describe, expect, it, vi } from "vitest";

const { embedContent } = vi.hoisted(() => ({ embedContent: vi.fn() }));

vi.mock("../../src/ai", () => ({
  gemini: {
    models: {
      embedContent,
    },
  },
}));

// Imported after the mock so `gemini` inside embed.ts resolves to the mock above.
import { embedText } from "../../src/rag/embed";

beforeEach(() => {
  embedContent.mockReset();
});

describe("embedText", () => {
  it("calls Gemini's embedContent with the requested model and text", async () => {
    embedContent.mockResolvedValue({
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    });

    await embedText("hello world");

    expect(embedContent).toHaveBeenCalledWith({
      model: "gemini-embedding-001",
      contents: "hello world",
      config: { outputDimensionality: 768 },
    });
  });

  it("returns the embedding vectors extracted from the response", async () => {
    embedContent.mockResolvedValue({
      embeddings: [{ values: [1, 2] }, { values: [3, 4] }],
    });

    const result = await embedText(["a", "b"]);

    expect(result).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("throws when Gemini returns no embeddings field", async () => {
    embedContent.mockResolvedValue({});

    await expect(embedText("x")).rejects.toThrow(
      "Gemini returned incomplete embeddings",
    );
  });

  it("throws when any embedding in the batch is missing values", async () => {
    embedContent.mockResolvedValue({
      embeddings: [{ values: [1, 2] }, { values: undefined }],
    });

    await expect(embedText(["a", "b"])).rejects.toThrow(
      "Gemini returned incomplete embeddings",
    );
  });
});
