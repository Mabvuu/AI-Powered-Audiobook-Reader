import { pipeline } from "@huggingface/transformers";

type ExtractorOutput = {
  data: Float32Array | number[];
};

type EmbeddingOptions = {
  pooling?: "mean";
  normalize?: boolean;
};

type EmbeddingExtractor = (
  input: string,
  options?: EmbeddingOptions
) => Promise<ExtractorOutput>;

let embedder: EmbeddingExtractor | null = null;

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

async function getEmbedder(): Promise<EmbeddingExtractor> {
  if (!embedder) {
    const extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );

    embedder = extractor as unknown as EmbeddingExtractor;
  }

  return embedder;
}

async function extractSingleEmbedding(input: string): Promise<number[]> {
  const extractor = await getEmbedder();

  const output = await extractor(input, {
    pooling: "mean",
    normalize: true,
  });

  const vector = output?.data;

  if (!vector) {
    throw new Error("Embedding model returned no data");
  }

  return Array.from(vector);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = cleanText(text);

  if (!input) {
    throw new Error("Cannot generate embedding for empty text");
  }

  return extractSingleEmbedding(input);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const cleaned = texts.map(cleanText);

  if (cleaned.length === 0) {
    return [];
  }

  const results: number[][] = [];

  for (const input of cleaned) {
    if (!input) {
      results.push([]);
      continue;
    }

    const embedding = await extractSingleEmbedding(input);
    results.push(embedding);
  }

  return results;
}