import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

type RouteContext = {
  params: Promise<{
    chapterId: string;
  }>;
};

type ChapterRow = {
  id: string;
  title: string | null;
  text: string | null;
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

function hasOpenAiTts() {
  return Boolean(process.env.OPENAI_API_KEY);
}

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
        const chunk = trimmedSentence.slice(i, i + maxLength).trim();
        if (chunk) {
          parts.push(chunk);
        }
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

function ensurePublicAudioDir() {
  const publicAudioDir = path.join(process.cwd(), "public", "audio");

  if (!fs.existsSync(publicAudioDir)) {
    fs.mkdirSync(publicAudioDir, { recursive: true });
  }

  return publicAudioDir;
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
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          audioParts: [],
          canGenerate: hasOpenAiTts(),
          message: "Failed to load chapter audio.",
        },
        { status: 500 }
      );
    }

    const audioParts = ((data ?? []) as unknown as ChapterAudioRow[]).sort(
      (a, b) => a.part_order - b.part_order
    );

    if (audioParts.length > 0) {
      return NextResponse.json({
        success: true,
        audioParts,
        canGenerate: hasOpenAiTts(),
        message: "Audio loaded successfully.",
      });
    }

    if (!hasOpenAiTts()) {
      return NextResponse.json({
        success: true,
        audioParts: [],
        canGenerate: false,
        message:
          "No saved audio found. OpenAI audio generation is not configured on the server.",
      });
    }

    return NextResponse.json({
      success: true,
      audioParts: [],
      canGenerate: true,
      message: "No saved audio found yet. You can generate it now.",
    });
  } catch (error) {
    console.error("GET_CHAPTER_AUDIO_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load chapter audio",
        audioParts: [],
        canGenerate: hasOpenAiTts(),
        message: "Failed to load chapter audio.",
      },
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
        {
          success: false,
          error: existingAudioError.message,
          audioParts: [],
          canGenerate: hasOpenAiTts(),
          message: "Failed to check existing chapter audio.",
        },
        { status: 500 }
      );
    }

    const existingRows = ((existingAudio ?? []) as unknown as ChapterAudioRow[]).sort(
      (a, b) => a.part_order - b.part_order
    );

    if (existingRows.length > 0) {
      return NextResponse.json({
        success: true,
        audioParts: existingRows,
        canGenerate: hasOpenAiTts(),
        message: "Existing audio found.",
      });
    }

    if (!hasOpenAiTts()) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI audio generation is not configured.",
          audioParts: [],
          canGenerate: false,
          message:
            "This server does not have OpenAI configured, so it cannot generate chapter audio files.",
        },
        { status: 503 }
      );
    }

    const { data: chapterData, error: chapterError } = await db
      .from("chapters")
      .select("id, title, text")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapterData) {
      return NextResponse.json(
        {
          success: false,
          error: chapterError?.message || "Chapter not found",
          audioParts: [],
          canGenerate: true,
          message: "Chapter not found.",
        },
        { status: 404 }
      );
    }

    const chapter = chapterData as unknown as ChapterRow;
    const chapterText = chapter.text?.trim() ?? "";
    const textParts = splitTextForTts(chapterText);

    if (textParts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Chapter has no text to convert to audio",
          audioParts: [],
          canGenerate: true,
          message: "This chapter has no text to convert to audio.",
        },
        { status: 400 }
      );
    }

    const publicAudioDir = ensurePublicAudioDir();
    const rowsToInsert: Array<{
      chapter_id: string;
      part_order: number;
      audio_url: string;
      model: string | null;
      voice: string | null;
    }> = [];

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

      rowsToInsert.push({
        chapter_id: chapterId,
        part_order: index + 1,
        audio_url: `/audio/${fileName}`,
        model: TTS_MODEL,
        voice: TTS_VOICE,
      });
    }

    const { data: savedAudioRows, error: insertError } = await db
      .from("chapter_audio")
      .insert(rowsToInsert)
      .select("id, chapter_id, part_order, audio_url, model, voice, created_at")
      .order("part_order", { ascending: true });

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          audioParts: [],
          canGenerate: true,
          message: "Audio files were generated but failed to save in the database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioParts: ((savedAudioRows ?? []) as unknown as ChapterAudioRow[]).sort(
        (a, b) => a.part_order - b.part_order
      ),
      canGenerate: true,
      message: "Chapter audio generated successfully.",
    });
  } catch (error) {
    console.error("GENERATE_CHAPTER_AUDIO_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate chapter audio",
        audioParts: [],
        canGenerate: hasOpenAiTts(),
        message: "Failed to generate chapter audio.",
      },
      { status: 500 }
    );
  }
}