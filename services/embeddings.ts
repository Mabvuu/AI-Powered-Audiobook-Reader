import { openai } from "@/lib/openai";

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = cleanText(text);

  if (!input) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const inputs = texts.map(cleanText).filter(Boolean);

  if (inputs.length === 0) {
    return [];
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });

  return response.data.map((item) => item.embedding);
}