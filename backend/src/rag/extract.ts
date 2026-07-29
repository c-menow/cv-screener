import fs from "fs/promises";
import { PDFParse } from "pdf-parse";
import { gemini } from "../ai";
import type { CvExtracted } from "../types";

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(pdfPath);

    const parser = new PDFParse({
      data: buffer,
    });

    const result = await parser.getText();
    await parser.destroy();

    return result.text.trim();
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error}`);
  }
}

export async function extractCvStructure(
  pdfText: string,
): Promise<CvExtracted> {
  const prompt = `
  You are a CV parser.

  Extract structured information from this CV:${pdfText}.

  Return ONLY valid JSON.
  No markdown.
  No explanation.

  Schema:
  {
    "name": "",
    "email": "",
    "summary": "",
    "experience": [
      {
        "role": "",
        "company": "",
        "dates": "",
        "description": ""
      }
    ],
    "education": [
      {
        "degree": "",
        "institution": "",
        "dates": ""
      }
    ],
    "skills": []
  }
`;

  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const content = response.text;

  if (!content) {
    throw new Error("Gemini returned no JSON");
  }

  return JSON.parse(content);
}
