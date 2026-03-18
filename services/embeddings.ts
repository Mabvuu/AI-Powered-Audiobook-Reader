import { pipeline } from "@huggingface/transformers";

type EmbeddingExtractor = (input: string, options?: {
  pooling?: "mean";
  normalize?: boolean;
}) => Promise<{
  data: Float32Array | number[];
}>;

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

export async function generateEmbedding(text: string): Promise<number[]> {
  const input = cleanText(text);

  if (!input) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const extractor = await getEmbedder();

  const output = await extractor(input, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const inputs = texts.map(cleanText).filter(Boolean);

  if (inputs.length === 0) {
    return [];
  }

  const extractor = await getEmbedder();
  const results: number[][] = [];

  for (const input of inputs) {
    const output = await extractor(input, {
      pooling: "mean",
      normalize: true,
    });

    results.push(Array.from(output.data));
  }

  return results;
}