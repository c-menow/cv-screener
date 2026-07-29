import { randomUUID, UUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { gemini } from "../ai";
import config from "../config";
import type { CvData } from "../types";
import { buildPdf } from "./utils/build-pdf";
import { seedData } from "./utils/seed-data";
import { parseJsonResponse } from "./utils/parse-response";

export async function generateCvText(
  name: string,
  promptHint: string | null,
): Promise<CvData> {
  const prompt = `Invent a realistic, fictional CV for a candidate named ${name}${promptHint ? ` matching this description: ${promptHint}` : ""}.
Make up a plausible job history, education, and skills — the person does not need to be real.
Return ONLY valid JSON (no markdown fences) matching this schema:
{
  "name": string, "title": string,
  "contact": { "email": string, "phone": string, "location": string, "linkedin": string },
  "summary": string,
  "experience": [{ "role": string, "company": string, "dates": string, "description": string[] }],
  "education": [{ "degree": string, "institution": string, "dates": string }],
  "skills": string[]
}`;
  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return parseJsonResponse<CvData>(text);
}

export async function generateCvPhoto(
  gender: string,
  titleHint: string | null,
): Promise<Buffer> {
  const response = await gemini.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt: `A photorealistic professional LinkedIn-style headshot of a fictional ${gender} adult person.
Requirements:
- Exactly one person in the image.
- Head and shoulders framing only.
- Centered composition with the face clearly visible.
- Neutral studio background.
- Professional CV, resume, and corporate profile photo style.
- Natural facial expression with a confident and approachable appearance.
- Professional clothing suitable for a ${titleHint || "professional"} role.

The person should be a diverse fictional individual with natural variation in age and appearance.
Do not depict a celebrity or any real identifiable person.
Do not include text, logos, watermarks, additional people, props, or distracting background elements.
`,
    config: {
      numberOfImages: 1,
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error("No image generated.");
  }

  return Buffer.from(imageBytes, "base64");
}

async function generateCV(
  name: string,
  gender: string,
  promptHint: string,
  includePhoto = true,
): Promise<{ cvId: UUID; cvData: CvData; pdfPath: string }> {
  try {
    const resumesDir = path.join(__dirname, "../../data/cvs");
    await fs.mkdir(resumesDir, { recursive: true });

    const cvId = randomUUID();
    const cvData = await generateCvText(name, promptHint);
    const cvPhoto = includePhoto
      ? await generateCvPhoto(gender, cvData.title)
      : null;
    const pdfBuffer = await buildPdf(cvData, cvPhoto);

    const pdfPath = path.join(resumesDir, `${cvId}.pdf`);

    await fs.writeFile(pdfPath, pdfBuffer);

    return { cvId, cvData, pdfPath };
  } catch (error) {
    throw error;
  }
}

async function main(): Promise<void> {
  const PROFILE_HINTS = [
    "Software Engineer",
    "Data Scientist",
    "Product Engineer",
    "Backend Engineer",
    "Frontend Engineer",
    "Machine Learning Engineer",
    "QA Engineer",
  ];

  const count = Number(process.argv[2] || config.TOTAL_CVS);

  for (let i = 0; i < count; i++) {
    const hint = PROFILE_HINTS[i % PROFILE_HINTS.length] as string;
    const { name, gender } = seedData[i]!;
    console.log(`Generating CV ${i + 1}/${count} (${name}, ${hint})...`);
    try {
      await generateCV(name, gender, hint);
    } catch (err) {
      throw err as Error;
    }
  }
}

main();
