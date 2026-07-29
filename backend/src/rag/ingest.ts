import fs from "fs";
import path from "path";
import { closePool } from "../db";
import { extractTextFromPdf, extractCvStructure } from "./extract";
import { embedText } from "./embed";
import { buildChunks } from "./chunk";
import { retrieveEmbeddings, storeEmbeddings } from "./store";

type IngestResult =
  | { skipped: true; cvId: string }
  | {
      skipped: false;
      cvId: string;
      candidateName: string | undefined;
      chunkCount: number;
    };

export async function ingestFile(filePath: string): Promise<IngestResult> {
  const cvId = path.basename(filePath, ".pdf");

  // If already ingested, leave the existing chunks.
  const existingCount = await retrieveEmbeddings(cvId);
  if (existingCount > 0) {
    return {
      cvId,
      skipped: true,
    };
  }

  const text = await extractTextFromPdf(filePath);
  const extractedCv = await extractCvStructure(text);
  const chunks = buildChunks(extractedCv);

  if (chunks.length === 0) {
    throw new Error(`CV parser returned no usable sections for ${filePath}`);
  }

  const candidateName = extractedCv.name?.trim();
  const candidateEmail = extractedCv.email?.trim();

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    const vectorLiteral = `[${embedding.join(",")}]`;

    await storeEmbeddings(
      cvId,
      filePath,
      candidateName,
      candidateEmail,
      chunk.section,
      chunk.content,
      vectorLiteral,
    );
  }

  return { cvId, candidateName, chunkCount: chunks.length, skipped: false };
}

async function main() {
  const resumesDir = path.join(__dirname, "../../data/cvs");

  if (!fs.existsSync(resumesDir)) {
    console.error(
      `No resumes found at ${resumesDir}. Run "npm run generate-cvs" first.`,
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(resumesDir)
    .filter((file) => file.endsWith(".pdf"))
    .map((file) => path.join(resumesDir, file));

  if (files.length === 0) {
    console.error(`No PDF files found in ${resumesDir}.`);
    process.exit(1);
  }

  let totalChunks = 0;
  let skipped = 0;
  for (const filePath of files) {
    const result = await ingestFile(filePath);

    if (result.skipped) {
      skipped++;
      continue;
    }

    totalChunks += result.chunkCount;
  }

  console.log(
    `Done. ${files.length - skipped} CVs ingested, ${skipped} skipped / ${totalChunks} chunks total.`,
  );
}

// Only execute when the file is run directly as a script and not when running tests.
if (require.main === module) {
  main()
    .catch((err) => {
      console.error("Ingestion failed:", err);
      process.exitCode = 1;
    })
    .finally(closePool);
}
