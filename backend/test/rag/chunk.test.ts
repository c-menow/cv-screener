import { describe, expect, it } from "vitest";
import { buildChunks } from "../../src/rag/chunk";
import type { CvExtracted } from "../../src/types";

const baseCv: CvExtracted = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  summary: "Analytical engine enthusiast.",
  experience: [
    {
      role: "Mathematician",
      company: "Analytical Engines Ltd",
      dates: "1840-1852",
      description: ["Wrote the first algorithm", "Published notes on Bernoulli numbers"],
    },
  ],
  education: [
    {
      degree: "Self-taught",
      institution: "Home",
      dates: "1815-1835",
    },
  ],
  skills: ["Mathematics", "Programming"],
};

describe("buildChunks", () => {
  it("produces one chunk per section that has content", () => {
    const chunks = buildChunks(baseCv);
    const sections = chunks.map((c) => c.section);

    expect(sections).toEqual(["summary", "experience", "education", "skills"]);
  });

  it("joins the summary as its own chunk, prefixed with the candidate's name", () => {
    const [summaryChunk] = buildChunks(baseCv);

    expect(summaryChunk).toEqual({
      section: "summary",
      content: "Ada Lovelace\nAnalytical engine enthusiast.",
    });
  });

  it("joins role, company, dates and description lines for an experience chunk", () => {
    const chunks = buildChunks(baseCv);
    const experienceChunk = chunks.find((c) => c.section === "experience");

    expect(experienceChunk?.content).toBe(
      "Mathematician\nAnalytical Engines Ltd\n1840-1852\nWrote the first algorithm\nPublished notes on Bernoulli numbers",
    );
  });

  it("creates a separate experience chunk per job", () => {
    const cv: CvExtracted = {
      ...baseCv,
      experience: [
        { role: "Engineer", company: "A", dates: "2020", description: [] },
        { role: "Manager", company: "B", dates: "2021", description: [] },
      ],
    };

    const experienceChunks = buildChunks(cv).filter(
      (c) => c.section === "experience",
    );
    expect(experienceChunks).toHaveLength(2);
    expect(experienceChunks[0]?.content).toContain("Engineer");
    expect(experienceChunks[1]?.content).toContain("Manager");
  });

  it("comma-joins skills into a single chunk", () => {
    const chunks = buildChunks(baseCv);
    const skillsChunk = chunks.find((c) => c.section === "skills");

    expect(skillsChunk?.content).toBe("Mathematics, Programming");
  });

  it("drops falsy values before joining a section's fields", () => {
    const cv: CvExtracted = {
      ...baseCv,
      experience: [
        {
          role: "Engineer",
          company: "",
          dates: "2020",
          description: [],
        },
      ],
    };

    const experienceChunk = buildChunks(cv).find(
      (c) => c.section === "experience",
    );
    expect(experienceChunk?.content).toBe("Engineer\n2020");
  });

  it("omits a section entirely when it has no usable content", () => {
    const cv: CvExtracted = {
      ...baseCv,
      name: "",
      summary: "",
      skills: [],
    };

    const sections = buildChunks(cv).map((c) => c.section);
    expect(sections).not.toContain("summary");
    expect(sections).not.toContain("skills");
  });

  it("still produces a summary chunk from the name alone when summary text is empty", () => {
    const cv: CvExtracted = { ...baseCv, summary: "" };

    const summaryChunk = buildChunks(cv).find((c) => c.section === "summary");
    expect(summaryChunk?.content).toBe("Ada Lovelace");
  });

  it("handles missing experience/education arrays gracefully", () => {
    const cv = {
      ...baseCv,
      experience: undefined,
      education: undefined,
    } as unknown as CvExtracted;

    expect(() => buildChunks(cv)).not.toThrow();
    const sections = buildChunks(cv).map((c) => c.section);
    expect(sections).toEqual(["summary", "skills"]);
  });

  it("returns an empty array when nothing has content", () => {
    const emptyCv: CvExtracted = {
      name: "",
      email: "",
      summary: "",
      experience: [],
      education: [],
      skills: [],
    };

    expect(buildChunks(emptyCv)).toEqual([]);
  });
});
