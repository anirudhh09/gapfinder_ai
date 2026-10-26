import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";

// IMPORTANT: the dimension must match vector(768) in supabase/schema.sql
const model = google.textEmbeddingModel("gemini-embedding-001");

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model,
    values: texts,
    providerOptions: { google: { outputDimensionality: 768, taskType: "RETRIEVAL_DOCUMENT" } },
  });
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model,
    value: text,
    providerOptions: { google: { outputDimensionality: 768, taskType: "RETRIEVAL_QUERY" } },
  });
  return embedding;
}
