import type { CvExtracted } from "../types";

export interface CvChunk {
  section: string;
  content: string;
}

export function buildChunks(cv: CvExtracted): CvChunk[] {
  const chunks: CvChunk[] = [];

  const addChunk = (section: string, values: (string | string[])[]) => {
    const content = values.flat().filter(Boolean).join("\n").trim();

    if (content) {
      chunks.push({ section, content });
    }
  };

  addChunk("summary", [cv.name, cv.summary]);

  for (const job of cv.experience ?? []) {
    addChunk("experience", [job.role, job.company, job.dates, job.description]);
  }

  for (const education of cv.education ?? []) {
    addChunk("education", [
      education.degree,
      education.institution,
      education.dates,
    ]);
  }

  addChunk("skills", [cv.skills?.filter(Boolean).join(", ")]);

  return chunks;
}
