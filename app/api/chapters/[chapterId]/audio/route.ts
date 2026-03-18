import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { openai } from "@/lib/openai";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type ChapterRow = {
  id: string;
  title: string;
  text: string;
};

type ChapterAudioRow = {
  id: string;
  chapter_id: string;
  part_order: number;
  audio_url: string;
  model: string | null;
  voice: string | null;
  created_at: string | null;
};

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

const TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.OPENAI_TTS_VOICE || "alloy";
const MAX_PART_LENGTH = 3500;

function splitTextForTts(text: string, maxLength = MAX_PART_LENGTH): string[] {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!cleanText) {
    return [];
  }

  const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleanText];
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (!trimmedSentence) {
      continue;
    }

    if (trimmedSentence.length > maxLength) {
      if (current.trim()) {
        parts.push(current.trim());
        current = "";
      }

      for (let i = 0; i < trimmedSentence.length; i += maxLength) {
        parts.push(trimmedSentence.slice(i, i + maxLength).trim());
      }

      continue;
    }

    const next = current ? `${current} ${trimmedSentence}` : trimmedSentence;

    if (next.length > maxLength) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = trimmedSentence;
    } else {
      current = next;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { chapterId } = await context.params;
    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const { data, error } = await db
      .from("chapter_audio")
      .select("id, chapter_id, part_order, audio_url, model, voice, created_at")
      .eq("chapter_id", chapterId)
      .order("part_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      audioParts: (data ?? []) as unknown as ChapterAudioRow[],
    });
  } catch (error) {
    console.error("GET_CHAPTER_AUDIO_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load chapter audio" },
      { status: 500 }
    );
  }
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    const { chapterId } = await context.params;
    const supabase = createServerSupabaseClient();
    const db = supabase as SupabaseServerClient;

    const { data: existingAudio, error: existingAudioError } = await db
      .from("chapter_audio")
      .select("id, chapter_id, part_order, audio_url, model, voice, created_at")
      .eq("chapter_id", chapterId)
      .order("part_order", { ascending: true });

    if (existingAudioError) {
      return NextResponse.json(
        { error: existingAudioError.message },
        { status: 500 }
      );
    }

    const existingRows = (existingAudio ?? []) as unknown as ChapterAudioRow[];

    if (existingRows.length > 0) {
      return NextResponse.json({
        success: true,
        audioParts: existingRows,
      });
    }

    const { data: chapterData, error: chapterError } = await db
      .from("chapters")
      .select("id, title, text")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapterData) {
      return NextResponse.json(
        { error: chapterError?.message || "Chapter not found" },
        { status: 404 }
      );
    }

    const chapter = chapterData as unknown as ChapterRow;
    const textParts = splitTextForTts(chapter.text);

    if (textParts.length === 0) {
      return NextResponse.json(
        { error: "Chapter has no text to convert to audio" },
        { status: 400 }
      );
    }

    const publicAudioDir = path.join(process.cwd(), "public", "audio");

    if (!fs.existsSync(publicAudioDir)) {
      fs.mkdirSync(publicAudioDir, { recursive: true });
    }

    const insertedRows: Omit<ChapterAudioRow, "id" | "created_at">[] = [];

    for (let index = 0; index < textParts.length; index += 1) {
      const input = textParts[index];

      const speech = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: TTS_VOICE,
        input,
      });

      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      const fileName = `${chapterId}-part-${index + 1}.mp3`;
      const filePath = path.join(publicAudioDir, fileName);

      fs.writeFileSync(filePath, audioBuffer);

      insertedRows.push({
        chapter_id: chapterId,
        part_order: index + 1,
        audio_url: `/audio/${fileName}`,
        model: TTS_MODEL,
        voice: TTS_VOICE,
      });
    }

    const { data: savedAudioRows, error: insertError } = await db
      .from("chapter_audio")
      .insert(insertedRows)
      .select("id, chapter_id, part_order, audio_url, model, voice, created_at")
      .order("part_order", { ascending: true });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioParts: (savedAudioRows ?? []) as unknown as ChapterAudioRow[],
    });
  } catch (error) {
    console.error("GENERATE_CHAPTER_AUDIO_ERROR", error);
    return NextResponse.json(
      { error: "Failed to generate chapter audio" },
      { status: 500 }
    );
  }
}