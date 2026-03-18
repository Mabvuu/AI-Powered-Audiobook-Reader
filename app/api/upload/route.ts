import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { extractText } from "@/services/textExtractor";
import { splitIntoChapters } from "@/services/chapterSplitter";
import { chunkText } from "@/utils/chunkText";
import { generateEmbeddings } from "@/services/embeddings";

type InsertedBook = {
  id: string;
  title: string;
  author: string | null;
  full_text: string | null;
  created_at: string | null;
};

type InsertedChapter = {
  id: string;
  book_id: string;
  title: string;
  chapter_order: number;
  text: string;
  summary: string | null;
  created_at: string | null;
};

type RawChunk = {
  book_id: string;
  chapter_id: string;
  chunk_order: number;
  text: string;
};

type ChunkInsertRow = {
  book_id: string;
  chapter_id: string;
  chunk_order: number;
  text: string;
  embedding: number[];
};

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

type ChunksInsertClient = {
  from: (table: "chunks") => {
    insert: (
      values: ChunkInsertRow[]
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const title = file.name.replace(/\.[^/.]+$/, "");
    const fullText = await extractText(filePath);

    if (!fullText?.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    const { data: insertedBook, error: bookError } = await db
      .from("books")
      .insert({
        title,
        author: null,
        full_text: fullText,
      })
      .select("id, title, author, full_text, created_at")
      .single();

    if (bookError || !insertedBook) {
      return NextResponse.json(
        { error: bookError?.message || "Failed to create book" },
        { status: 500 }
      );
    }

    const book = insertedBook as unknown as InsertedBook;

    const chapterPayload = splitIntoChapters(fullText).map((chapter) => ({
      book_id: book.id,
      title: chapter.title,
      chapter_order: chapter.chapter_order,
      text: chapter.text,
      summary: null,
    }));

    let insertedChapters: InsertedChapter[] = [];

    if (chapterPayload.length > 0) {
      const { data: chapterRows, error: chaptersError } = await db
        .from("chapters")
        .insert(chapterPayload)
        .select("id, book_id, title, chapter_order, text, summary, created_at");

      if (chaptersError) {
        return NextResponse.json(
          { error: chaptersError.message },
          { status: 500 }
        );
      }

      insertedChapters = (chapterRows ?? []) as unknown as InsertedChapter[];
    }

    const rawChunks: RawChunk[] = insertedChapters.flatMap(
      (chapter: InsertedChapter) => {
        const chunks = chunkText(chapter.text)
          .map((chunk: string) => chunk.trim())
          .filter(Boolean);

        return chunks.map((chunk: string, index: number) => ({
          book_id: book.id,
          chapter_id: chapter.id,
          chunk_order: index + 1,
          text: chunk,
        }));
      }
    );

    if (rawChunks.length === 0) {
      return NextResponse.json({
        success: true,
        bookId: book.id,
        chaptersCreated: insertedChapters.length,
        chunksCreated: 0,
      });
    }

    const embeddings = await generateEmbeddings(
      rawChunks.map((chunk: RawChunk) => chunk.text)
    );

    const chunkPayload: ChunkInsertRow[] = rawChunks.map(
      (chunk: RawChunk, index: number) => ({
        book_id: chunk.book_id,
        chapter_id: chunk.chapter_id,
        chunk_order: chunk.chunk_order,
        text: chunk.text,
        embedding: embeddings[index],
      })
    );

    const chunksDb = db as unknown as ChunksInsertClient;
    const { error: chunksError } = await chunksDb.from("chunks").insert(chunkPayload);

    if (chunksError) {
      return NextResponse.json(
        { error: chunksError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookId: book.id,
      chaptersCreated: insertedChapters.length,
      chunksCreated: chunkPayload.length,
    });
  } catch (error) {
    console.error("UPLOAD_ERROR", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}