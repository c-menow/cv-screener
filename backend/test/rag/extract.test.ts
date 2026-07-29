import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFile, getText, destroy, generateContent } = vi.hoisted(() => ({
  readFile: vi.fn(),
  getText: vi.fn(),
  destroy: vi.fn(),
  generateContent: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: { readFile },
}));

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParse() {
    return { getText, destroy };
  }),
}));

vi.mock("../../src/ai", () => ({
  gemini: {
    models: {
      generateContent,
    },
  },
}));

import { extractCvStructure, extractTextFromPdf } from "../../src/rag/extract";

beforeEach(() => {
  readFile.mockReset();
  getText.mockReset();
  destroy.mockReset();
  generateContent.mockReset();
});

describe("extractTextFromPdf", () => {
  it("reads the file and returns the trimmed parsed text", async () => {
    readFile.mockResolvedValue(Buffer.from("pdf bytes"));
    getText.mockResolvedValue({ text: "  Some CV text  \n" });

    const result = await extractTextFromPdf("/tmp/cv.pdf");

    expect(readFile).toHaveBeenCalledWith("/tmp/cv.pdf");
    expect(result).toBe("Some CV text");
  });

  it("destroys the parser after extracting text", async () => {
    readFile.mockResolvedValue(Buffer.from("pdf bytes"));
    getText.mockResolvedValue({ text: "text" });

    await extractTextFromPdf("/tmp/cv.pdf");

    expect(destroy).toHaveBeenCalledOnce();
  });

  it("wraps read failures in a descriptive error", async () => {
    readFile.mockRejectedValue(new Error("ENOENT"));

    await expect(extractTextFromPdf("/tmp/missing.pdf")).rejects.toThrow(
      "Failed to extract PDF text",
    );
  });
});

describe("extractCvStructure", () => {
  it("sends the pdf text to Gemini and parses the JSON response", async () => {
    const cvJson = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      summary: "Summary",
      experience: [],
      education: [],
      skills: ["Math"],
    };
    generateContent.mockResolvedValue({ text: JSON.stringify(cvJson) });

    const result = await extractCvStructure("raw cv text");

    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.1-flash-lite",
        config: { temperature: 0, responseMimeType: "application/json" },
      }),
    );
    const call = generateContent.mock.calls[0]?.[0];
    expect(call.contents).toContain("raw cv text");
    expect(result).toEqual(cvJson);
  });

  it("throws when Gemini returns no text", async () => {
    generateContent.mockResolvedValue({ text: undefined });

    await expect(extractCvStructure("raw cv text")).rejects.toThrow(
      "Gemini returned no JSON",
    );
  });

  it("propagates a parse error when Gemini's text is not valid JSON", async () => {
    generateContent.mockResolvedValue({ text: "not json" });

    await expect(extractCvStructure("raw cv text")).rejects.toThrow();
  });
});
