import { supabase } from "@/lib/supabase";

export type ChunkMatch = {
  id: string;
  book_id: string;
  chapter_id: string;
  chunk_order: number;
  text: string;
  similarity: number;
  chapter_title: string | null;
  chapter_order: number | null;
};

type RpcChunkMatch = {
  id: string;
  book_id: string;
  chapter_id: string;
  chunk_order: number;
  text: string;
  similarity: number;
  chapter_title?: string | null;
  chapter_order?: number | null;
};

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{
    data: RpcChunkMatch[] | null;
    error: { message: string } | null;
  }>;
};

export async function searchBookChunks(params: {
  bookId: string;
  embedding: number[];
  matchCount?: number;
}): Promise<ChunkMatch[]> {
  const { bookId, embedding, matchCount = 6 } = params;

  if (!bookId) {
    throw new Error("bookId is required");
  }

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("embedding is required");
  }

  const rpcClient = supabase as unknown as RpcClient;

  const { data, error } = await rpcClient.rpc("match_chunks", {
    query_embedding: embedding,
    input_book_id: bookId,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    book_id: row.book_id,
    chapter_id: row.chapter_id,
    chunk_order: row.chunk_order,
    text: row.text,
    similarity: row.similarity,
    chapter_title: row.chapter_title ?? null,
    chapter_order: row.chapter_order ?? null,
  }));
}