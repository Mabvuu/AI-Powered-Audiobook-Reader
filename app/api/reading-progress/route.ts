import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type ProgressBody = {
  userId: string;
  bookId: string;
  chapterId: string;
  partOrder: number;
  currentPosition: number;
};

type ProgressRow = {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  part_order: number;
  current_position: number;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const bookId = searchParams.get("bookId");

    if (!userId || !bookId) {
      return NextResponse.json(
        { error: "userId and bookId are required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const { data, error } = await db
      .from("reading_progress")
      .select(
        "id, user_id, book_id, chapter_id, part_order, current_position, created_at, updated_at"
      )
      .eq("user_id", userId)
      .eq("book_id", bookId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      progress: (data ?? null) as unknown as ProgressRow | null,
    });
  } catch (error) {
    console.error("GET_READING_PROGRESS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load reading progress" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProgressBody;
    const { userId, bookId, chapterId, partOrder, currentPosition } = body;

    if (!userId || !bookId || !chapterId) {
      return NextResponse.json(
        { error: "userId, bookId and chapterId are required" },
        { status: 400 }
      );
    }

    const safePartOrder =
      Number.isFinite(partOrder) && partOrder > 0 ? Math.floor(partOrder) : 1;

    const safeCurrentPosition =
      Number.isFinite(currentPosition) && currentPosition >= 0
        ? Math.floor(currentPosition)
        : 0;

    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const { data, error } = await db
      .from("reading_progress")
      .upsert(
        {
          user_id: userId,
          book_id: bookId,
          chapter_id: chapterId,
          part_order: safePartOrder,
          current_position: safeCurrentPosition,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,book_id",
        }
      )
      .select(
        "id, user_id, book_id, chapter_id, part_order, current_position, created_at, updated_at"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      progress: data as unknown as ProgressRow,
    });
  } catch (error) {
    console.error("SAVE_READING_PROGRESS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to save reading progress" },
      { status: 500 }
    );
  }
}