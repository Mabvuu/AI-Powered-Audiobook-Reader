import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { extractText } from "@/services/textExtractor";
import { splitIntoChapters } from "@/services/chapterSplitter";
import { chunkText } from "@/utils/chunkText";

type InsertedBook = {
  id: string;
  title: string;
  author: string | null;
  genre?: string | null;
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

type ChunkInsertRow = {
  book_id: string;
  chapter_id: string;
  chunk_order: number;
  text: string;
};

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

type ChunksInsertClient = {
  from: (table: "chunks") => {
    insert: (
      values: ChunkInsertRow[]
    ) => Promise<{ error: { message: string } | null }>;
  };
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.-]/g, "-");
}

function sanitizeText(text: string) {
  return text
    .replace(/\0/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/\uFFFD/g, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const genreValue = formData.get("genre");
    const genre =
      typeof genreValue === "string" && genreValue.trim()
        ? genreValue.trim()
        : null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const allowedExtensions = [".pdf", ".epub", ".txt"];
    const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only PDF, EPUB, and TXT files are supported" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const title = file.name.replace(/\.[^/.]+$/, "").trim() || "Untitled Book";

    const extractedText = await extractText(filePath);
    const fullText = sanitizeText(extractedText ?? "");

    if (!fullText) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    const baseBookPayload = {
      title,
      author: null,
      full_text: fullText,
    };

    let insertedBook: InsertedBook | null = null;
    let bookInsertError: string | null = null;

    if (genre) {
      const { data, error } = await db
        .from("books")
        .insert({
          ...baseBookPayload,
          genre,
        })
        .select("id, title, author, full_text, created_at")
        .single();

      if (!error && data) {
        insertedBook = data as unknown as InsertedBook;
      } else {
        bookInsertError = error?.message || null;
      }
    }

    if (!insertedBook) {
      const { data, error } = await db
        .from("books")
        .insert(baseBookPayload)
        .select("id, title, author, full_text, created_at")
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || bookInsertError || "Failed to create book" },
          { status: 500 }
        );
      }

      insertedBook = data as unknown as InsertedBook;
    }

    const book = insertedBook;
    const detectedChapters = splitIntoChapters(fullText);

    const chapterPayload =
      detectedChapters.length > 0
        ? detectedChapters.map((chapter) => ({
            book_id: book.id,
            title: sanitizeText(chapter.title || "Untitled Chapter"),
            chapter_order: chapter.chapter_order,
            text: sanitizeText(chapter.text || ""),
            summary: null,
          }))
        : [
            {
              book_id: book.id,
              title: title || "Chapter 1",
              chapter_order: 1,
              text: fullText,
              summary: null,
            },
          ];

    const validChapterPayload = chapterPayload.filter(
      (chapter) => chapter.text.trim().length > 0
    );

    if (validChapterPayload.length === 0) {
      return NextResponse.json(
        { error: "No valid chapter text could be created from file" },
        { status: 400 }
      );
    }

    const { data: chapterRows, error: chaptersError } = await db
      .from("chapters")
      .insert(validChapterPayload)
      .select("id, book_id, title, chapter_order, text, summary, created_at");

    if (chaptersError) {
      return NextResponse.json(
        { error: chaptersError.message },
        { status: 500 }
      );
    }

    const insertedChapters = (chapterRows ?? []) as unknown as InsertedChapter[];

    const firstChapter = [...insertedChapters].sort(
      (a, b) => a.chapter_order - b.chapter_order
    )[0];

    const rawChunks: ChunkInsertRow[] = insertedChapters.flatMap((chapter) => {
      const chunks = chunkText(chapter.text)
        .map((chunk: string) => sanitizeText(chunk))
        .filter(Boolean);

      return chunks.map((chunk: string, index: number) => ({
        book_id: book.id,
        chapter_id: chapter.id,
        chunk_order: index + 1,
        text: chunk,
      }));
    });

    let chunksCreated = 0;

    if (rawChunks.length > 0) {
      const chunksDb = db as unknown as ChunksInsertClient;
      const { error: chunksError } = await chunksDb.from("chunks").insert(rawChunks);

      if (!chunksError) {
        chunksCreated = rawChunks.length;
      }
    }

    return NextResponse.json({
      success: true,
      book: {
        id: book.id,
        title: book.title,
      },
      firstChapterId: firstChapter?.id ?? null,
      redirectTo: firstChapter
        ? `/books/${book.id}/chapters/${firstChapter.id}`
        : `/books/${book.id}`,
      chaptersCreated: insertedChapters.length,
      chunksCreated,
      manualMode: true,
    });
  } catch (error) {
    console.error("UPLOAD_ERROR", error);

    const message =
      error instanceof Error ? error.message : "Upload failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}