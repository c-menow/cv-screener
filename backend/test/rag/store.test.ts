import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../../src/db", () => ({
  pool: { query },
}));

import { retrieveEmbeddings, similaritySearch, storeEmbeddings } from "../../src/rag/store";

beforeEach(() => {
  query.mockReset();
});

describe("storeEmbeddings", () => {
  it("inserts a row with the candidate, chunk and vector fields in order", async () => {
    query.mockResolvedValue({});

    await storeEmbeddings(
      "cv-1",
      "/cvs/cv-1.pdf",
      "Ada Lovelace",
      "ada@example.com",
      "summary",
      "Summary text",
      "[0.1,0.2]",
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO cv_chunks"),
      [
        "cv-1",
        "/cvs/cv-1.pdf",
        "Ada Lovelace",
        "ada@example.com",
        "summary",
        "Summary text",
        "[0.1,0.2]",
      ],
    );
  });
});

describe("retrieveEmbeddings", () => {
  it("returns the row count for a given cv_id", async () => {
    query.mockResolvedValue({ rows: [{ count: "3", candidate_name: "Ada" }] });

    const count = await retrieveEmbeddings("cv-1");

    expect(query).toHaveBeenCalledWith(expect.stringContaining("cv_chunks"), [
      "cv-1",
    ]);
    expect(count).toBe(3);
  });

  it("returns 0 when there are no matching rows", async () => {
    query.mockResolvedValue({ rows: [] });

    const count = await retrieveEmbeddings("cv-missing");

    expect(count).toBe(0);
  });
});

describe("similaritySearch", () => {
  it("builds a vector literal from the query embedding and passes topK as the limit", async () => {
    query.mockResolvedValue({ rows: [] });

    await similaritySearch([[0.1, 0.2, 0.3]], 5);

    expect(query).toHaveBeenCalledWith(expect.any(String), [
      "[0.1,0.2,0.3]",
      5,
    ]);
  });

  it("defaults topK to 5 when not provided", async () => {
    query.mockResolvedValue({ rows: [] });

    await similaritySearch([[1, 2]]);

    expect(query).toHaveBeenCalledWith(expect.any(String), ["[1,2]", 5]);
  });

  it("returns the rows from the query result", async () => {
    const rows = [
      {
        cv_id: "cv-1",
        source_file: "/cvs/cv-1.pdf",
        candidate_name: "Ada",
        candidate_email: "ada@example.com",
        section: "summary",
        content: "text",
        similarity: 0.9,
      },
    ];
    query.mockResolvedValue({ rows });

    const result = await similaritySearch([[1, 2]]);

    expect(result).toEqual(rows);
  });
});
