import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type BookmarkBody = {
  userId: string;
  bookId: string;
  chapterId: string;
  partOrder: number;
  timeInAudio: number;
  note?: string;
};

type BookmarkRow = {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  part_order: number;
  time_in_audio: number;
  note: string | null;
  created_at: string | null;
};

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const bookId = searchParams.get("bookId");
    const chapterId = searchParams.get("chapterId");

    if (!userId || !bookId) {
      return NextResponse.json(
        { error: "userId and bookId are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    let query = db
      .from("bookmarks")
      .select(
        "id, user_id, book_id, chapter_id, part_order, time_in_audio, note, created_at"
      )
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (chapterId) {
      query = query.eq("chapter_id", chapterId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookmarks: (data ?? []) as unknown as BookmarkRow[],
    });
  } catch (error) {
    console.error("GET_BOOKMARKS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load bookmarks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookmarkBody;
    const { userId, bookId, chapterId, partOrder, timeInAudio, note } = body;

    if (!userId || !bookId || !chapterId) {
      return NextResponse.json(
        { error: "userId, bookId and chapterId are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const { data, error } = await db
      .from("bookmarks")
      .insert({
        user_id: userId,
        book_id: bookId,
        chapter_id: chapterId,
        part_order: partOrder || 1,
        time_in_audio: timeInAudio || 0,
        note: note?.trim() || null,
      })
      .select(
        "id, user_id, book_id, chapter_id, part_order, time_in_audio, note, created_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookmark: data as unknown as BookmarkRow,
    });
  } catch (error) {
    console.error("SAVE_BOOKMARK_ERROR", error);
    return NextResponse.json(
      { error: "Failed to save bookmark" },
      { status: 500 }
    );
  }
}