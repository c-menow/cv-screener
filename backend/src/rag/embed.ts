import { gemini } from "../ai";

export async function embedText(texts: string[] | string): Promise<number[][]> {
  const response = await gemini.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
    config: {
      outputDimensionality: 768,
    },
  });

  const embeddings = response.embeddings?.map((embedding) => embedding.values);

  if (!embeddings || embeddings.some((embedding) => !embedding)) {
    throw new Error("Gemini returned incomplete embeddings");
  }

  return embeddings as number[][];
}
