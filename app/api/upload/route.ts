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

    const filePath = path.join(uploadDir, file.name);
    fs.writeFileSync(filePath, buffer);

    const supabase = createServerSupabaseClient();
    const title = file.name.replace(/\.[^/.]+$/, "");
    const fullText = await extractText(filePath);

    const { data: insertedBook, error: bookError } = await supabase
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

    const book = insertedBook as InsertedBook;

    const chapterPayload = splitIntoChapters(fullText).map((chapter) => ({
      book_id: book.id,
      title: chapter.title,
      chapter_order: chapter.chapter_order,
      text: chapter.text,
      summary: null,
    }));

    let insertedChapters: InsertedChapter[] = [];

    if (chapterPayload.length > 0) {
      const { data: chapterRows, error: chaptersError } = await supabase
        .from("chapters")
        .insert(chapterPayload)
        .select("id, book_id, title, chapter_order, text, summary, created_at");

      if (chaptersError) {
        return NextResponse.json(
          { error: chaptersError.message },
          { status: 500 }
        );
      }

      insertedChapters = (chapterRows ?? []) as InsertedChapter[];
    }

    const chunkPayload = insertedChapters.flatMap((chapter) => {
      const chunks = chunkText(chapter.text);

      return chunks.map((chunk, index) => ({
        book_id: book.id,
        chapter_id: chapter.id,
        chunk_order: index + 1,
        text: chunk,
        embedding: null,
      }));
    });

    if (chunkPayload.length > 0) {
      const { error: chunksError } = await supabase
        .from("chunks")
        .insert(chunkPayload);

      if (chunksError) {
        return NextResponse.json(
          { error: chunksError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      bookId: book.id,
      chaptersCreated: insertedChapters.length,
      chunksCreated: chunkPayload.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}